import express from "express";
import bcrypt from "bcryptjs";
import Student from "../models/Student.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { lastName, firstName, middleName, studentID, email, password, course, section, yearLevel } = req.body;

    // ✅ Check all required fields including separated name fields and section
    if (!lastName || !firstName || !middleName || !studentID || !email || !password || !course || !section || !yearLevel) {
      return res.status(400).json({ msg: "All fields are required." });
    }

    // ✅ Updated Student ID format (any two digits)
    const studentIDPattern = /^\d{2}-\d{4}-\d{6}$/;
    if (!studentIDPattern.test(studentID)) {
      return res.status(400).json({
        msg: "Student ID format is invalid. Use nn-nnnn-nnnnnn (e.g., 12-3456-789012)."
      });
    }

    // ✅ Updated Email format validation
    const emailPattern = /^[a-z]+\.[a-z]+\.au@phinmaed\.com$/;
    if (!emailPattern.test(email.toLowerCase())) {
      return res.status(400).json({
        msg: "Email format is invalid. Use name.au@phinmaed.com (e.g., jama.presentacion.au@phinmaed.com)."
      });
    }

    // Check for existing email
    const existingEmail = await Student.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        msg: "Email is already used by another student.",
        existingStudentID: existingEmail.studentID
      });
    }

    // Check for existing studentID
    const existingStudent = await Student.findOne({ studentID });
    if (existingStudent) {
      return res.status(400).json({
        msg: "Student ID already exists.",
        existingEmail: existingStudent.email
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new student (fullName will be available as virtual)
    const newStudent = new Student({
      lastName: lastName.toUpperCase(),
      firstName: firstName.toUpperCase(),
      middleName: middleName.toUpperCase(),
      studentID,
      email: email.toLowerCase(),
      password: hashedPassword,
      course: course.toUpperCase(),
      section: section.toUpperCase(),
      yearLevel
    });

    const savedStudent = await newStudent.save();

    return res.status(201).json({
      msg: "Student registered successfully.",
      student: {
        fullName: savedStudent.fullName, // Using virtual property
        studentID: savedStudent.studentID,
        email: savedStudent.email,
        course: savedStudent.course,
        section: savedStudent.section,
        yearLevel: savedStudent.yearLevel
      }
    });

  } catch (err) {
    console.error("❌ Registration error details:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        msg: `${field} already exists.`,
        details: err.keyValue
      });
    }

    if (err.name === "ValidationError") {
      return res.status(400).json({
        msg: "Validation error",
        details: Object.values(err.errors).map(error => error.message)
      });
    }

    return res.status(500).json({
      msg: "Server error while registering student",
      error: err.message
    });
  }
});

// Optional: Add login route if needed
router.post("/login", async (req, res) => {
  try {
    const { studentID, password } = req.body;

    if (!studentID || !password) {
      return res.status(400).json({ msg: "Student ID and password are required." });
    }

    const student = await Student.findOne({ studentID });
    if (!student) {
      return res.status(400).json({ msg: "Invalid Student ID or password." });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid Student ID or password." });
    }

    return res.status(200).json({
      msg: "Login successful",
      student: {
        fullName: student.fullName, // Using virtual property
        studentID: student.studentID,
        email: student.email,
        course: student.course,
        section: student.section,
        yearLevel: student.yearLevel
      }
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({
      msg: "Server error during login",
      error: err.message
    });
  }
});

export default router;