import express from "express";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const {
      lastName,
      firstName,
      middleName,
      contactNumber,
      email,
      employeeID,
      department,
      designation,
      employmentStatus,
      password,
      role,
      accountStatus,
      createdBy
    } = req.body;

    // Validate required fields
    if (!lastName || !firstName || !middleName || !contactNumber || !email || 
        !employeeID || !department || !designation || !employmentStatus || 
        !password || !role || !accountStatus || !createdBy) {
      return res.status(400).json({ msg: "All fields are required." });
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ msg: "Please enter a valid email address." });
    }

    // Validate contact number (basic validation)
    const contactPattern = /^\+?[\d\s-()]{10,}$/;
    if (!contactPattern.test(contactNumber)) {
      return res.status(400).json({ msg: "Please enter a valid contact number." });
    }

    // Check for existing email or employeeID
    const exists = await Admin.findOne({ 
      $or: [{ email }, { employeeID }] 
    });
    
    if (exists) {
      return res.status(400).json({ 
        msg: "Email or Employee ID already exists." 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const newAdmin = new Admin({
      lastName: lastName.toUpperCase(),
      firstName: firstName.toUpperCase(),
      middleName: middleName.toUpperCase(),
      contactNumber,
      email: email.toLowerCase(),
      employeeID: employeeID.toUpperCase(),
      department: department.toUpperCase(),
      designation,
      employmentStatus,
      password: hashedPassword,
      role,
      accountStatus,
      createdBy
    });

    await newAdmin.save();

    res.status(201).json({ 
      msg: "Admin registered successfully.",
      admin: {
        fullName: newAdmin.fullName,
        employeeID: newAdmin.employeeID,
        email: newAdmin.email,
        department: newAdmin.department,
        designation: newAdmin.designation,
        role: newAdmin.role
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    
    if (err.name === "ValidationError") {
      return res.status(400).json({
        msg: "Validation error",
        details: Object.values(err.errors).map(error => error.message)
      });
    }
    
    res.status(500).json({ msg: "Server error during registration." });
  }
});

// Additional route to get all admins (optional)
router.get("/", async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});
// Add these routes to adminRoutes.js

// Get all users (admins and professors)
router.get("/users", async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    const professors = await Professor.find().select('-password');
    
    // Combine and format users
    const users = [
      ...admins.map(admin => ({
        _id: admin._id,
        fullName: `${admin.lastName}, ${admin.firstName} ${admin.middleName}`,
        employeeID: admin.employeeID,
        department: admin.department,
        designation: admin.designation,
        employmentStatus: admin.employmentStatus,
        role: admin.role,
        accountStatus: admin.accountStatus,
        type: 'admin'
      })),
      ...professors.map(professor => ({
        _id: professor._id,
        fullName: `${professor.lastName}, ${professor.firstName} ${professor.middleName}`,
        employeeID: professor.employeeID,
        department: professor.department,
        designation: professor.designation,
        employmentStatus: professor.employmentStatus,
        role: professor.role,
        accountStatus: professor.accountStatus,
        type: 'professor'
      }))
    ];

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ msg: 'Error fetching users' });
  }
});

// Update user account status
router.put("/users/:id/status", async (req, res) => {
  try {
    const { accountStatus } = req.body;
    const { id } = req.params;

    // Try to find and update in Admin collection
    let user = await Admin.findByIdAndUpdate(
      id,
      { accountStatus },
      { new: true }
    ).select('-password');

    // If not found in Admin, try Professor collection
    if (!user) {
      user = await Professor.findByIdAndUpdate(
        id,
        { accountStatus },
        { new: true }
      ).select('-password');
    }

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({ msg: 'Account status updated successfully', user });
  } catch (error) {
    console.error('Error updating account status:', error);
    res.status(500).json({ msg: 'Error updating account status' });
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Try to delete from Admin collection
    let user = await Admin.findByIdAndDelete(id);

    // If not found in Admin, try Professor collection
    if (!user) {
      user = await Professor.findByIdAndDelete(id);
    }

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({ msg: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ msg: 'Error deleting user' });
  }
});
// Add these routes to your adminRoutes.js

// Get all accounts
router.get("/accounts", async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    const professors = await Professor.find().select('-password');
    
    const accounts = [
      ...admins.map(admin => ({ ...admin.toObject(), type: 'admin' })),
      ...professors.map(prof => ({ ...prof.toObject(), type: 'professor' }))
    ];
    
    res.json({ accounts });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({ msg: "Error fetching accounts" });
  }
});

// Update account status
router.put("/accounts/:employeeID/status", async (req, res) => {
  try {
    const { employeeID } = req.params;
    const { accountStatus } = req.body;
    
    let account = await Admin.findOne({ employeeID });
    if (!account) {
      account = await Professor.findOne({ employeeID });
    }
    
    if (!account) {
      return res.status(404).json({ msg: "Account not found" });
    }
    
    account.accountStatus = accountStatus;
    await account.save();
    
    res.json({ msg: "Account status updated successfully" });
  } catch (error) {
    console.error("Error updating account status:", error);
    res.status(500).json({ msg: "Error updating account status" });
  }
});

// Delete account
router.delete("/accounts/:employeeID", async (req, res) => {
  try {
    const { employeeID } = req.params;
    
    let result = await Admin.findOneAndDelete({ employeeID });
    if (!result) {
      result = await Professor.findOneAndDelete({ employeeID });
    }
    
    if (!result) {
      return res.status(404).json({ msg: "Account not found" });
    }
    
    res.json({ msg: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ msg: "Error deleting account" });
  }
});

// Add these routes to adminRoutes.js

// Get all accounts - UPDATED VERSION
router.get("/accounts", async (req, res) => {
  try {
    const accounts = await Admin.find().select('-password').lean();
    
    // Manually add fullName since virtuals don't work with lean()
    const accountsWithFullName = accounts.map(account => ({
      ...account,
      fullName: `${account.lastName}, ${account.firstName} ${account.middleName}`.trim()
    }));
    
    res.json({ accounts: accountsWithFullName });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ msg: 'Error fetching accounts' });
  }
});

// Update account status
router.patch("/accounts/:id/status", async (req, res) => {
  try {
    const { accountStatus } = req.body;
    const account = await Admin.findByIdAndUpdate(
      req.params.id,
      { accountStatus },
      { new: true }
    ).select('-password');
    
    if (!account) {
      return res.status(404).json({ msg: 'Account not found' });
    }
    
    res.json({ msg: 'Account status updated successfully', account });
  } catch (error) {
    console.error('Error updating account status:', error);
    res.status(500).json({ msg: 'Error updating account status' });
  }
});

// Delete account
router.delete("/accounts/:id", async (req, res) => {
  try {
    const account = await Admin.findByIdAndDelete(req.params.id);
    
    if (!account) {
      return res.status(404).json({ msg: 'Account not found' });
    }
    
    res.json({ msg: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ msg: 'Error deleting account' });
  }
});

export default router;