import express from "express";
import Student from "../models/Student.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { fullName, studentID, email, password, course, yearLevel } = req.body;

    // Validate required fields
    if (!studentID) return res.status(400).json({ msg: "Student ID is required." });

    // Check for duplicates by studentID or email
    const existing = await Student.findOne({ 
      $or: [{ studentID }, { email }]
    });

    if (existing) {
      return res.status(400).json({ msg: "Student ID or Email already registered." });
    }

    const newStudent = new Student({
      fullName,
      studentID,
      email,
      password,
      course,
      yearLevel
    });

    await newStudent.save();
    res.status(201).json({ msg: "Student registered successfully." });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ msg: "Server error while registering student." });
  }
});

export default router;
