// controllers/courseFacultyController.js
// (updated to support Programmes and new schema relations)

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// GET ALL FACULTY
module.exports.getAllFaculty = async (req, res) => {
  try {
    const facultyMembers = await prisma.user.findMany({
      where: { role: "FACULTY" },
      include: { department: true },
    });
    res.status(200).json(facultyMembers);
  } catch (error) {
    console.error("Error fetching faculty members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// CREATE FACULTY
module.exports.createFaculty = async (req, res) => {
  try {
    const { name, email, password, departmentId } = req.body;

    // validate department exists (optional but safer)
    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) {
        return res.status(400).json({ error: "Invalid departmentId" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newFaculty = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        departmentId: departmentId || null,
        role: "FACULTY",
      },
      include: { department: true },
    });

    res.status(201).json(newFaculty);
  } catch (error) {
    console.error("Error creating faculty member: ", error);
    // handle unique email case
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// UPDATE FACULTY
module.exports.updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, departmentId } = req.body;

    // optional validation of department
    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) return res.status(400).json({ error: "Invalid departmentId" });
    }

    const updatedFaculty = await prisma.user.update({
      where: { id },
      data: { name, email, departmentId },
      include: { department: true },
    });

    res.status(200).json(updatedFaculty);
  } catch (error) {
    console.error("Error updating faculty:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Faculty not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE FACULTY
module.exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({ where: { id } });

    res.status(200).json({ message: "Faculty deleted successfully" });
  } catch (error) {
    console.error("Error deleting faculty:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Faculty not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET FACULTY BY ID
module.exports.getFacultyById = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await prisma.user.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!faculty) return res.status(404).json({ error: "Faculty not found" });

    res.status(200).json(faculty);
  } catch (error) {
    console.error("Error fetching faculty member:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET FACULTY BY DEPARTMENT
module.exports.getFacultyByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const faculty = await prisma.user.findMany({
      where: {
        role: "FACULTY",
        departmentId,
      },
      include: { department: true },
    });

    res.status(200).json(faculty);
  } catch (error) {
    console.log("Error fetching faculty by department:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ASSIGN COURSE TO FACULTY
module.exports.assignCourseToFaculty = async (req, res) => {
  try {
    const { facultyId, courseId, semester, academicYear } = req.body;

    const faculty = await prisma.user.findUnique({
      where: { id: facultyId },
      include: { department: true },
    });

    if (!faculty || faculty.role !== "FACULTY") {
      return res.status(404).json({ error: "Faculty not found" });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { department: true, programme: true },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // ensure faculty and course belong to same department
    if (faculty.departmentId && course.departmentId && faculty.departmentId !== course.departmentId) {
      return res.status(400).json({
        error: "Faculty and Course must belong to the same department",
      });
    }

    const assignment = await prisma.facultyCourseAssignment.create({
      data: {
        facultyId,
        courseId,
        semester,
        academicYear,
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error assigning course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET COURSES TEACHING BY A FACULTY
module.exports.getCoursesByFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const courses = await prisma.facultyCourseAssignment.findMany({
      where: { facultyId },
      include: { course: { include: { programme: true, createdBy: { select: { name: true } } } } },
    });

    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// REMOVE COURSE ASSIGNMENT
module.exports.removeCourseFromFaculty = async (req, res) => {
  try {
    const { facultyId, courseId } = req.body;

    await prisma.facultyCourseAssignment.deleteMany({
      where: { facultyId, courseId },
    });

    res.status(200).json({ message: "Course unassigned successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET FACULTY WITH COURSES
module.exports.getFacultyWithCourses = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await prisma.user.findUnique({
      where: { id },
      include: {
        assignedCourses: { include: { course: { include: { programme: true } } } },
      },
    });

    if (!faculty) return res.status(404).json({ error: "Faculty not found" });

    res.status(200).json(faculty);
  } catch (error) {
    console.error("Error fetching faculty:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// CREATE COURSE
module.exports.createCourse = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      credits,
      category,
      version,
      threshold,
      programmeId,
    } = req.body;

    // require programmeId (recommended) and validate it belongs to the same department
    if (!programmeId) {
      return res.status(400).json({ error: "programmeId is required" });
    }

    const programme = await prisma.programme.findUnique({ where: { id: programmeId } });
    if (!programme) return res.status(400).json({ error: "Invalid programmeId" });

    // ensure programme belongs to req.user.departmentId
    if (req.user?.departmentId && programme.departmentId !== req.user.departmentId) {
      return res.status(400).json({ error: "Programme does not belong to your department" });
    }

    const course = await prisma.course.create({
      data: {
        code,
        name,
        description,
        credits: parseInt(credits),
        category,
        version,
        threshold: parseFloat(threshold),
        departmentId: req.user.departmentId, // keep department in sync
        programmeId,
        createdById: req.user.id,
      },
      include: {
        programme: true,
        createdBy: { select: { name: true } },
      },
    });

    res.status(201).json(course);
  } catch (error) {
    console.error("Create course error:", error);
    // duplicate code
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Course code already exists" });
    }
    res.status(400).json({ error: error.message });
  }
};

// GET COURSES (active courses in user's department)
module.exports.getCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: {
        departmentId: req.user.departmentId,
        isActive: true,
      },
      include: {
        createdBy: { select: { name: true } },
        programme: true,
        clos: { where: { isActive: true } },
        assignments: {
          include: {
            faculty: { select: { name: true } },
          },
        },
      },
    });
    res.json(courses);
  } catch (error) {
    console.error("getCourses error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports.getAllCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: {
        departmentId: req.user.departmentId,
      },
      include: {
        createdBy: { select: { name: true } },
        programme: true,
        clos: { where: { isActive: true } },
        assignments: {
          include: {
            faculty: { select: { name: true } },
          },
        },
      },
    });
    res.json(courses);
  } catch (error) {
    console.error("getAllCourses error:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET COURSE BY ID
module.exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        programme: true,
        clos: { where: { isActive: true } },
        assignments: {
          include: {
            faculty: { select: { name: true } },
          },
        },
      },
    });

    if (!course) return res.status(404).json({ error: "Course not found" });

    res.json(course);
  } catch (error) {
    console.error("getCourseById error:", error);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE COURSE
module.exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // if programmeId provided, validate it
    if (updates.programmeId) {
      const programme = await prisma.programme.findUnique({ where: { id: updates.programmeId } });
      if (!programme) return res.status(400).json({ error: "Invalid programmeId" });

      // ensure programme belongs to same department (if req.user.departmentId exists)
      if (req.user?.departmentId && programme.departmentId !== req.user.departmentId) {
        return res.status(400).json({ error: "Programme does not belong to your department" });
      }
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: updates,
      include: { programme: true },
    });

    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error("Error updating course:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Course not found" });
    }
    res.status(500).json({ error: error.message });
  }
};

// DELETE COURSE (soft delete)
module.exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.course.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(400).json({ error: error.message });
  }
};

// CREATE CLO
module.exports.createCLO = async (req, res) => {
  try {
    const { cloCode, description, bloomLevel, version, courseId } = req.body;

    // validate course exists and belongs to user's department
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(400).json({ error: "Invalid courseId" });
    if (req.user?.departmentId && course.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: "Course does not belong to your department" });
    }

    const clo = await prisma.cLO.create({
      data: {
        cloCode,
        description,
        bloomLevel,
        version,
        courseId,
        createdById: req.user.id,
      },
      include: {
        course: true,
        mappings: {
          include: {
            po: true,
            pso: true,
          },
        },
      },
    });

    res.status(201).json(clo);
  } catch (error) {
    console.error("createCLO error:", error);
    res.status(400).json({ error: error.message });
  }
};

// UPDATE CLO
module.exports.updateCLO = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const clo = await prisma.cLO.update({
      where: { id },
      data: updates,
      include: {
        mappings: {
          include: {
            po: true,
            pso: true,
          },
        },
      },
    });

    res.json(clo);
  } catch (error) {
    console.error("updateCLO error:", error);
    res.status(400).json({ error: error.message });
  }
};

// GET CLOs BY COURSE
module.exports.getCLOsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const clos = await prisma.cLO.findMany({
      where: {
        courseId,
        isActive: true,
      },
      include: {
        mappings: {
          include: {
            po: true,
            pso: true,
          },
        },
        course: { include: { programme: true } },
      },
    });
    res.json(clos);
  } catch (error) {
    console.error("getCLOsByCourse error:", error);
    res.status(500).json({ error: error.message });
  }
};

// MAP CLO TO PO/PSO
module.exports.mapCLOToPOPSO = async (req, res) => {
  try {
    const { cloId, poId, psoId, correlation, version } = req.body;

    if (correlation < 0 || correlation > 3) {
      return res
        .status(400)
        .json({ error: "Correlation must be between 0 and 3" });
    }

    const mapping = await prisma.cLOPOPSOMapping.create({
      data: {
        cloId,
        poId,
        psoId,
        correlation: parseInt(correlation),
        version,
      },
      include: {
        clo: true,
        po: true,
        pso: true,
      },
    });

    res.status(201).json(mapping);
  } catch (error) {
    console.error("Error mapping CLO to PO/PSO:", error);
    res.status(400).json({ error: error.message });
  }
};

// GET CLO-PO/PSO MAPPINGS BY COURSE
module.exports.getCLOMappings = async (req, res) => {
  try {
    const { courseId } = req.params;

    const mappings = await prisma.cLOPOPSOMapping.findMany({
      where: {
        clo: { courseId },
      },
      include: { clo: true, po: true, pso: true },
    });

    res.status(200).json(mappings);
  } catch (error) {
    console.error("Error fetching mappings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET DASHBOARD STATS
exports.getDashboardStats = async (req, res) => {
  try {
    const departmentId = req.user.departmentId;

    // Count courses under HOD's department
    const totalCourses = await prisma.course.count({
      where: { departmentId, isActive: true },
    });

    // Count active CLOs under the department's courses
    const activeCLOs = await prisma.cLO.count({
      where: {
        isActive: true,
        course: { departmentId },
      },
    });

    // Count Programmes for this department
    const programmesCount = await prisma.programme.count({
      where: { departmentId },
    });

    // Count Program Outcomes for this department
    const programOutcomes = await prisma.pO.count({
      where: { departmentId },
    });

    // Pending Reviews → count attainment reviews whose attainment -> clo -> course -> departmentId matches
    const pendingReviews = await prisma.attainmentReview.count({
      where: {
        status: "PENDING",
        attainment: {
          clo: {
            course: {
              departmentId,
            },
          },
        },
      },
    }).catch(() => 0);

    res.json({
      totalCourses,
      activeCLOs,
      programOutcomes,
      pendingReviews,
      programmesCount,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
};
