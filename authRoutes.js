import express from "express";
import bcrypt from "bcryptjs";
import Student from "../models/Student.js";
import Professor from "../models/Professor.js";
import Admin from "../models/Admin.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { id, password } = req.body;

  try {
    let userType, user;

    if (id.startsWith("01-")) {
      user = await Student.findOne({ studentID: id });
      userType = "student";
    } else if (id.startsWith("P-")) {
      user = await Professor.findOne({ professorID: id });
      userType = "professor";
    } else if (id.startsWith("A-")) {
      user = await Admin.findOne({ employeeID: id }); // Changed from adminID to employeeID
      userType = "admin";
    } else {
      return res.status(400).json({ msg: "Invalid ID format." });
    }

    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials." });
    }

    // Use bcrypt to compare passwords (if you've implemented hashing)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials." });
    }

    // Store user session
    req.session.user = {
      id: user.employeeID || user.professorID || user.studentID,
      userType: userType,
      fullName: user.fullName || `${user.lastName}, ${user.firstName} ${user.middleName}`,
      email: user.email
    };

    res.json({ 
      msg: "Login successful", 
      userType,
      user: {
        id: user.employeeID || user.professorID || user.studentID,
        fullName: user.fullName || `${user.lastName}, ${user.firstName} ${user.middleName}`,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Account Update Route
router.post("/update-account", async (req, res) => {
  try {
    const {
      employeeID,
      lastName,
      firstName,
      middleName,
      contactNumber,
      email,
      department,
      designation,
      employmentStatus,
      role,
      currentPassword,
      newPassword
    } = req.body;

    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ msg: "Not authenticated" });
    }

    let UserModel;
    let userQuery;

    if (req.session.user.userType === 'admin') {
      UserModel = Admin;
      userQuery = { employeeID: req.session.user.id };
    } else if (req.session.user.userType === 'professor') {
      UserModel = Professor;
      userQuery = { professorID: req.session.user.id };
    } else {
      return res.status(400).json({ msg: "Invalid user type" });
    }

    // Find the user
    const user = await UserModel.findOne(userQuery);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Verify current password if trying to change password
    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Current password is incorrect" });
      }

      // Hash new password if provided
      if (newPassword) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
      }
    }

    // Update user fields based on role
    if (req.session.user.userType === 'admin') {
      // Admin can update all fields
      user.lastName = lastName || user.lastName;
      user.firstName = firstName || user.firstName;
      user.middleName = middleName || user.middleName;
      user.contactNumber = contactNumber || user.contactNumber;
      user.email = email || user.email;
      user.department = department || user.department;
      user.designation = designation || user.designation;
      user.employmentStatus = employmentStatus || user.employmentStatus;
      user.role = role || user.role;
    } else if (req.session.user.userType === 'professor') {
      // Professor can only update contact number and password
      user.contactNumber = contactNumber || user.contactNumber;
      // Other fields remain unchanged for professors
    }

    await user.save();

    // Update session if name changed
    if (firstName || lastName) {
      req.session.user.fullName = `${firstName || user.firstName} ${lastName || user.lastName}`;
    }

    res.json({ msg: "Account updated successfully" });

  } catch (error) {
    console.error("Update account error:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({ msg: "Email already exists" });
    }
    
    res.status(500).json({ msg: "Server error while updating account" });
  }
});

// Logout route
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ msg: "Error logging out" });
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.json({ msg: "Logout successful" });
  });
});

router.get("/current-user", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ msg: "Not authenticated" });
  }
  
  res.json({ 
    user: req.session.user 
  });
});

export default router;