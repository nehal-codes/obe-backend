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

    const hashedPassword = await bcrypt.hash(password, 12);

    const newFaculty = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        departmentId,
        role: "FACULTY",
      },
    });

    res.status(201).json(newFaculty);
  } catch (error) {
    console.error("Error creating faculty member: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// UPDATE FACULTY
module.exports.updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, departmentId } = req.body;

    const updatedFaculty = await prisma.user.update({
      where: { id },
      data: { name, email, departmentId },
    });

    res.status(200).json(updatedFaculty);
  } catch (error) {
    console.error("Error updating faculty:", error);
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
      include: { department: true },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (faculty.departmentId !== course.departmentId) {
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
      include: { course: true },
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
        assignedCourses: { include: { course: true } },
      },
    });

    res.status(200).json(faculty);
  } catch (error) {
    console.error("Error fetching faculty:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//CREATE COURSE
module.exports.createCourse = async (req, res) => {
  try {
    const { code, name, description, credits, category, version, threshold } =
      req.body;

    const course = await prisma.course.create({
      data: {
        code,
        name,
        description,
        credits: parseInt(credits),
        category,
        version,
        threshold: parseFloat(threshold),
        departmentId: req.user.departmentId,
        createdById: req.user.id,
      },
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//GET COURSES
module.exports.getCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: {
        departmentId: req.user.departmentId,
        isActive: true,
      },
      include: {
        createdBy: { select: { name: true } },
        clos: { where: { isActive: true } },
        assignments: {
          include: {
            faculty: { select: { name: true } },
          },
        },
      },
    });
    console.log("COURSES =", courses);
    res.json(courses);
  } catch (error) {
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
        clos: { where: { isActive: true } },
        assignments: {
          include: {
            faculty: { select: { name: true } },
          },
        },
      },
    });
    console.log("COURSES =", courses);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//GET COURSE BY ID
module.exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        clos: { where: { isActive: true } },
        assignments: {
          include: {
            faculty: { select: { name: true } },
          },
        },
      },
    });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//UPDATE COURSE
module.exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedCourse = await prisma.course.update({
      where: { id },
      data: updates,
    });

    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: error.message });
  }
};

//DELETE COURSE
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

//CREATE CLO
module.exports.createCLO = async (req, res) => {
  try {
    const { cloCode, description, bloomLevel, version, courseId } = req.body;
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
    res.status(400).json({ error: error.message });
  }
};

//UPDATE CLO
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
    res.status(400).json({ error: error.message });
  }
};

//GET CLOs BY COURSE
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
        course: true,
      },
    });
    res.json(clos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//MAP CLO TO PO/PSO
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

//GET CLO-PO/PSO MAPPINGS BY COURSE
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

//GET DASHBORAD STATS
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

    // Count Program Outcomes for this department
    const programOutcomes = await prisma.pO.count({
      where: { departmentId },
    });

    // Pending Reviews → Example logic (customize)
    const pendingReviews = await prisma.attainmentReview
      .count({
        where: { status: "PENDING", departmentId },
      })
      .catch(() => 0); // if table not made yet

    res.json({
      totalCourses,
      activeCLOs,
      programOutcomes,
      pendingReviews,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
};
