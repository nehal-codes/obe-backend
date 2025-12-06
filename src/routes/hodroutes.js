const express = require("express");
const {
  getAllFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getFacultyById,
  getFacultyByDepartment,
  assignCourseToFaculty,
  getCoursesByFaculty,
  removeCourseFromFaculty,
  getFacultyWithCourses,
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  createCLO,
  getCLOsByCourse,
  updateCLO,
  mapCLOToPOPSO,
  getCLOMappings,
} = require("../controllers/hodController");

const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Get all faculty
router.get("/faculty", authenticate, getAllFaculty);

// Create faculty
router.post("/faculty", authenticate, createFaculty);

// Update faculty
router.put("/faculty/:id", authenticate, updateFaculty);

// Delete faculty
router.delete("/faculty/:id", authenticate, deleteFaculty);

// Get faculty by ID
router.get("/faculty/:id", authenticate, getFacultyById);

// Get faculty by department
router.get(
  "/faculty/department/:departmentId",
  authenticate,
  getFacultyByDepartment
);

// Get faculty along with assigned courses
router.get("/faculty/:id/courses", authenticate, getFacultyWithCourses);

// Assign course to faculty
router.post("/faculty/assign-course", authenticate, assignCourseToFaculty);

// Get courses assigned to a faculty
router.get(
  "/faculty/:facultyId/assigned-courses",
  authenticate,
  getCoursesByFaculty
);

// Remove assigned course from a faculty
router.delete("/faculty/remove-course", authenticate, removeCourseFromFaculty);

// Create course
router.post("/course", authenticate, createCourse);

// Get all courses
router.get("/courses", authenticate, getCourses);

// Get course by ID
router.get("/course/:id", authenticate, getCourseById);

// Update course
router.put("/course/:id", authenticate, updateCourse);

// Delete course
router.delete("/course/:id", authenticate, deleteCourse);

// Create CLO
router.post("/clo", authenticate, createCLO);

// Get CLOs by course
router.get("/clo/course/:courseId", authenticate, getCLOsByCourse);

// Update CLO
router.put("/clo/:id", authenticate, updateCLO);

// Map CLO to PO/PSO
router.post("/clo/map", authenticate, mapCLOToPOPSO);

// Get CLO mappings for a course
router.get("/clo/mappings/:courseId", authenticate, getCLOMappings);

module.exports = router;
