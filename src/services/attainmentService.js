// backend/src/services/attainmentService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AttainmentService {
  async calculateDirectAttainment(courseId, academicYear, semester) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        clos: {
          where: { isActive: true },
          include: {
            assessments: {
              include: {
                assessment: true
              }
            }
          }
        },
        assessments: {
          include: {
            attainments: true
          }
        }
      }
    });

    const attainmentResults = [];

    for (const clo of course.clos) {
      let totalAttainment = 0;
      let totalWeightage = 0;

      for (const assessmentMapping of clo.assessments) {
        const attainment = await prisma.attainmentRecord.findFirst({
          where: {
            cloId: clo.id,
            assessmentId: assessmentMapping.assessmentId,
            academicYear,
            semester
          }
        });

        if (attainment) {
          const attainmentPercentage = (attainment.attainedCount / attainment.studentCount) * 100;
          const attainmentLevel = this.calculateAttainmentLevel(attainmentPercentage, course.threshold);
          
          totalAttainment += attainmentLevel * assessmentMapping.weightage;
          totalWeightage += assessmentMapping.weightage;
        }
      }

      const finalAttainment = totalWeightage > 0 ? totalAttainment / totalWeightage : 0;
      attainmentResults.push({
        cloId: clo.id,
        cloCode: clo.cloCode,
        attainment: finalAttainment
      });
    }

    return attainmentResults;
  }

  calculateAttainmentLevel(percentage, threshold) {
    if (percentage >= threshold + 20) return 3; // High
    if (percentage >= threshold + 10) return 2; // Medium
    if (percentage >= threshold) return 1;      // Low
    return 0;                                   // Not attained
  }

  async calculateIndirectAttainment(departmentId, academicYear, semester) {
    const surveys = await prisma.surveyIndirectAttainment.findMany({
      where: {
        OR: [
          { po: { departmentId } },
          { pso: { departmentId } }
        ],
        academicYear,
        semester
      },
      include: {
        po: true,
        pso: true
      }
    });

    const poAttainment = {};
    const psoAttainment = {};

    surveys.forEach(survey => {
      if (survey.poId) {
        if (!poAttainment[survey.poId]) {
          poAttainment[survey.poId] = { total: 0, count: 0 };
        }
        poAttainment[survey.poId].total += survey.responseLevel;
        poAttainment[survey.poId].count++;
      }

      if (survey.psoId) {
        if (!psoAttainment[survey.psoId]) {
          psoAttainment[survey.psoId] = { total: 0, count: 0 };
        }
        psoAttainment[survey.psoId].total += survey.responseLevel;
        psoAttainment[survey.psoId].count++;
      }
    });

    const result = {
      po: {},
      pso: {}
    };

    Object.keys(poAttainment).forEach(poId => {
      result.po[poId] = poAttainment[poId].total / poAttainment[poId].count;
    });

    Object.keys(psoAttainment).forEach(psoId => {
      result.pso[psoId] = psoAttainment[psoId].total / psoAttainment[psoId].count;
    });

    return result;
  }

  async calculateFinalAttainment(courseId, academicYear, semester) {
    const direct = await this.calculateDirectAttainment(courseId, academicYear, semester);
    const indirect = await this.calculateIndirectAttainment(
      (await prisma.course.findUnique({ where: { id: courseId } })).departmentId,
      academicYear,
      semester
    );

    // Calculate PO/PSO attainment from CLO mappings
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        clos: {
          include: {
            mappings: {
              include: {
                po: true,
                pso: true
              }
            }
          }
        }
      }
    });

    const poAttainment = {};
    const psoAttainment = {};

    direct.forEach(cloAttainment => {
      const clo = course.clos.find(c => c.id === cloAttainment.cloId);
      clo.mappings.forEach(mapping => {
        if (mapping.poId) {
          if (!poAttainment[mapping.poId]) {
            poAttainment[mapping.poId] = { total: 0, weight: 0 };
          }
          poAttainment[mapping.poId].total += cloAttainment.attainment * mapping.correlation;
          poAttainment[mapping.poId].weight += mapping.correlation;
        }

        if (mapping.psoId) {
          if (!psoAttainment[mapping.psoId]) {
            psoAttainment[mapping.psoId] = { total: 0, weight: 0 };
          }
          psoAttainment[mapping.psoId].total += cloAttainment.attainment * mapping.correlation;
          psoAttainment[mapping.psoId].weight += mapping.correlation;
        }
      });
    });

    const finalPO = {};
    const finalPSO = {};

    Object.keys(poAttainment).forEach(poId => {
      const directValue = poAttainment[poId].weight > 0 ? 
        poAttainment[poId].total / poAttainment[poId].weight : 0;
      const indirectValue = indirect.po[poId] || 0;
      finalPO[poId] = (directValue * 0.8) + (indirectValue * 0.2);
    });

    Object.keys(psoAttainment).forEach(psoId => {
      const directValue = psoAttainment[psoId].weight > 0 ? 
        psoAttainment[psoId].total / psoAttainment[psoId].weight : 0;
      const indirectValue = indirect.pso[psoId] || 0;
      finalPSO[psoId] = (directValue * 0.8) + (indirectValue * 0.2);
    });

    return {
      direct,
      indirect,
      finalPO,
      finalPSO
    };
  }
}

module.exports = new AttainmentService();