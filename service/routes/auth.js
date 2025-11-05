import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userService } from '../db/index.js';

const router = express.Router();
const SALT_ROUNDS = 12;

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        success: false 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long',
        success: false 
      });
    }
    
    // Check if user already exists
    const existingUser = await userService.getByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email already exists',
        success: false 
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create user
    const user = await userService.create({ 
      email, 
      name, 
      passwordHash 
    });
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    // Return user data without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ 
      error: 'Failed to register user',
      success: false 
    });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        success: false 
      });
    }
    
    // Find user by email
    const user = await userService.getByEmail(email);
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        success: false 
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        success: false 
      });
    }
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    // Return user data without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ 
      error: 'Failed to login user',
      success: false 
    });
  }
});

// POST /api/auth/logout - Logout user (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Please remove the token from client storage.'
  });
});

// GET /api/auth/me - Get current user profile (requires token)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await userService.getById(req.userId);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        success: false 
      });
    }
    
    // Return user data without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user profile',
      success: false 
    });
  }
});

// Middleware to authenticate JWT token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      success: false 
    });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        success: false 
      });
    }
    
    req.userId = decoded.userId;
    req.user = { id: decoded.userId }; // Also attach user object for convenience
    next();
  });
}

export default router;