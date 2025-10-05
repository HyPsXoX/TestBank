import express from "express";
import bcrypt from "bcryptjs";
import Student from "../models/Student.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { fullName, studentID, email, password, course, yearLevel } = req.body;

    if (!fullName || !studentID || !email || !password || !course || !yearLevel) {
      return res.status(400).json({ msg: "All fields are required." });
    }

    const existingEmail = await Student.findOne({ email });
    if (existingEmail && existingEmail.studentID !== studentID) {
      return res.status(400).json({ 
        msg: "Email is already used by another student.", 
        existingStudentID: existingEmail.studentID 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newStudent = {
      fullName,
      studentID,
      email,
      password: hashedPassword,
      course,
      yearLevel
    };

    const savedStudent = await Student.findOneAndUpdate(
      { studentID },
      newStudent,
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({ msg: "Student registered successfully.", student: savedStudent });

  } catch (err) {
    console.error("❌ Registration error details:", err);

    if (err.name === "ValidationError") {
      res.status(400).json({ msg: "Validation error", details: err.errors });
    } else if (err.code === 11000) {
      res.status(400).json({ msg: "Duplicate field error", details: err.keyValue });
    } else {
      res.status(500).json({ msg: "Server error while registering student", error: err.message });
    }
  }
});

export default router;