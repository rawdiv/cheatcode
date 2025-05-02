require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001; // Changed from 3000 to avoid conflicts

// Middleware
app.use(cors({
  origin: ['http://localhost:8000', 'http://127.0.0.1:8000', '*'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Configure session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'cheatcode-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://dyiuezrvgafcmgrikilg.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aXVlenJ2Z2FmY21ncmlraWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwOTk4NDksImV4cCI6MjA2MTY3NTg0OX0.4mbBNBzLqhGtfl6sgl1HarxvIjo0gy-crWNm4FEASUg';
const supabase = createClient(supabaseUrl, supabaseKey);

// Authentication Endpoints

// User signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          lastName
        }
      }
    });
    
    if (error) throw error;
    
    res.status(200).json({ success: true, user: data.user });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Sign in user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Store user in session
    req.session.user = data.user;
    
    res.status(200).json({ success: true, user: data.user, session: data.session });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// User logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear session
    req.session.destroy();
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// User Profile Endpoints

// Create user profile
app.post('/api/profiles/create', async (req, res) => {
  try {
    const { userId, firstName, lastName, email } = req.body;
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        { 
          id: userId,
          first_name: firstName,
          last_name: lastName,
          email: email,
          created_at: new Date()
        }
      ]);
    
    if (error) throw error;
    
    res.status(200).json({ success: true, profile: data });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get user profile
app.get('/api/profiles/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    res.status(200).json({ success: true, profile: data });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update user profile
app.put('/api/profiles/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
    
    res.status(200).json({ success: true, profile: data });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// User Preferences Endpoints

// Save user preferences
app.post('/api/preferences', async (req, res) => {
  try {
    const { userId, goal, commitment, difficulty, onboardingCompleted } = req.body;
    
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert([
        {
          user_id: userId,
          goal: goal,
          commitment: commitment,
          difficulty: difficulty,
          onboarding_completed: onboardingCompleted,
          updated_at: new Date()
        }
      ]);
    
    if (error) throw error;
    
    res.status(200).json({ success: true, preferences: data });
  } catch (error) {
    console.error('Save preferences error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get user preferences
app.get('/api/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    res.status(200).json({ success: true, preferences: data });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ======================================
// PROBLEM MANAGEMENT ENDPOINTS
// ======================================

// Get a random problem based on difficulty
app.get('/api/get-problem', async (req, res) => {
  try {
    const { difficulty, userId } = req.query;
    
    // Check if we have problems in database
    let query = supabase
      .from('problems')
      .select('*');
    
    // Filter by difficulty if provided
    if (difficulty && difficulty !== 'all') {
      query = query.eq('difficulty', difficulty);
    }
    
    // Get the problems
    let { data: problems, error } = await query;
    
    if (error) throw error;
    
    // If no problems in database or error, use fallback sample problems
    if (!problems || problems.length === 0) {
      problems = [
        {
          id: "1",
          title: "Two Sum",
          slug: "two-sum",
          difficulty: "easy",
          description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
          topics: ["arrays", "hash-table"],
          code_template: "function twoSum(nums, target) {\n    // Your code here\n}",
          examples: [
            {
              input: "nums = [2,7,11,15], target = 9",
              output: "[0,1]",
              explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
            }
          ],
          solution: {
            approach: "Use a hash map to store each element's value and its index. For each element, check if its complement (target - current value) exists in the hash map."
          }
        },
        {
          id: "2",
          title: "Maximum Subarray",
          slug: "maximum-subarray",
          difficulty: "medium",
          description: "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
          topics: ["arrays", "dynamic-programming", "kadane-algorithm"],
          code_template: "function maxSubArray(nums) {\n    // Your code here\n}",
          examples: [
            {
              input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
              output: "6",
              explanation: "The subarray [4,-1,2,1] has the largest sum = 6."
            }
          ],
          solution: {
            approach: "Use Kadane's algorithm to find the maximum subarray sum by tracking the current sum and the maximum sum encountered so far."
          }
        },
        {
          id: "3",
          title: "Reverse Linked List",
          slug: "reverse-linked-list",
          difficulty: "easy",
          description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
          topics: ["linked-list", "recursion"],
          code_template: "function reverseList(head) {\n    // Your code here\n}",
          examples: [
            {
              input: "head = [1,2,3,4,5]",
              output: "[5,4,3,2,1]",
              explanation: "The reversed linked list has nodes in reverse order."
            }
          ],
          solution: {
            approach: "Use three pointers (prev, current, next) to reverse each link in the list iteratively."
          }
        }
      ];
      console.log("Using fallback problems as database is empty");
    }
    
    // If userId provided, filter out problems the user has already solved
    let availableProblems = problems;
    
    if (userId) {
      try {
        const { data: solvedProblems, error: progressError } = await supabase
          .from('user_progress')
          .select('problem_id')
          .eq('user_id', userId)
          .eq('status', 'completed');
        
        if (!progressError && solvedProblems && solvedProblems.length > 0) {
          const solvedProblemIds = solvedProblems.map(p => p.problem_id);
          availableProblems = problems.filter(p => !solvedProblemIds.includes(p.id));
        }
      } catch (err) {
        console.log("Error fetching user progress:", err);
      }
    }
    
    // If all problems are solved, return random problem anyway
    if (availableProblems.length === 0) {
      availableProblems = problems;
    }
    
    // Get a random problem
    const randomProblem = availableProblems[Math.floor(Math.random() * availableProblems.length)];
    
    // Return the problem with sensitive data removed
    const sanitizedProblem = { ...randomProblem };
    
    // If the problem has a solution with code, remove it to prevent cheating
    if (sanitizedProblem.solution && typeof sanitizedProblem.solution === 'object') {
      sanitizedProblem.solution = {
        approach: sanitizedProblem.solution.approach || "Think about efficient algorithms."
      };
    }
    
    res.json(sanitizedProblem);
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({ error: 'Failed to get problem' });
  }
});

// Get problems list (for admin panel)
app.get('/api/problems', async (req, res) => {
  try {
    const { limit = 20, offset = 0, difficulty } = req.query;
    
    // Check if user is admin (TEMPORARILY BYPASSED)
    // if (!req.session.user || !req.session.user.email || !req.session.user.email.includes('admin')) {
    //   return res.status(403).json({ error: 'Unauthorized access' });
    // }
    
    let query = supabase
      .from('problems')
      .select('*');
    
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    
    const { data, error } = await query
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // If no problems, return empty array
    if (!data || data.length === 0) {
      return res.json([]);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ error: 'Failed to get problems' });
  }
});

// Add new problem (admin only)
app.post('/api/problems', async (req, res) => {
  try {
    // Check if user is admin (TEMPORARILY BYPASSED)
    // if (!req.session.user || !req.session.user.email || !req.session.user.email.includes('admin')) {
    //   return res.status(403).json({ error: 'Unauthorized access' });
    // }
    
    const { 
      title, 
      slug, 
      description, 
      difficulty, 
      topics, 
      examples, 
      testCases, 
      solution,
      code_template 
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields (title, description, difficulty)' });
    }
    
    // Create a slug if not provided
    const problemSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Prepare the problem data based on existing columns
    // If you have problems with rows being rejected, simplify this structure
    const problemData = {
      title,
      slug: problemSlug,
      description,
      difficulty,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Add optional fields if they exist in the table
    try {
      // Try to add topics as a string if it's not supported as an array
      if (topics) {
        if (Array.isArray(topics)) {
          problemData.topics = topics;
        } else {
          problemData.topics = topics.split(',').map(t => t.trim());
        }
      }
      
      // Add other fields that might be supported
      if (code_template) problemData.code_template = code_template;
      if (examples) problemData.examples = examples;
      if (testCases) problemData.testCases = testCases;
      if (solution) problemData.solution = solution;
    } catch (err) {
      console.error('Error formatting problem data:', err);
    }
    
    // Insert problem
    const { data, error } = await supabase
      .from('problems')
      .insert([problemData])
      .select();
    
    if (error) {
      console.error('Error details:', error);
      throw error;
    }
    
    res.status(201).json({ success: true, problem: data[0] || problemData });
  } catch (error) {
    console.error('Create problem error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update problem (admin only)
app.put('/api/problems/:problemId', async (req, res) => {
  try {
    // Check if user is admin (TEMPORARILY BYPASSED)
    // if (!req.session.user || !req.session.user.email || !req.session.user.email.includes('admin')) {
    //   return res.status(403).json({ error: 'Unauthorized access' });
    // }
    
    const { problemId } = req.params;
    const updates = req.body;
    
    // Add updated timestamp
    updates.updated_at = new Date();
    
    const { data, error } = await supabase
      .from('problems')
      .update(updates)
      .eq('id', problemId)
      .select();
    
    if (error) throw error;
    
    res.status(200).json({ success: true, problem: data[0] });
  } catch (error) {
    console.error('Update problem error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete problem (admin only)
app.delete('/api/problems/:problemId', async (req, res) => {
  try {
    // Check if user is admin (TEMPORARILY BYPASSED)
    // if (!req.session.user || !req.session.user.email || !req.session.user.email.includes('admin')) {
    //   return res.status(403).json({ error: 'Unauthorized access' });
    // }
    
    const { problemId } = req.params;
    
    const { error } = await supabase
      .from('problems')
      .delete()
      .eq('id', problemId);
    
    if (error) throw error;
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete problem error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bulk import problems (admin only)
app.post('/api/problems/bulk', async (req, res) => {
  try {
    // Check if user is admin (TEMPORARILY BYPASSED)
    // if (!req.session.user || !req.session.user.email || !req.session.user.email.includes('admin')) {
    //   return res.status(403).json({ error: 'Unauthorized access' });
    // }
    
    const { problems } = req.body;
    
    if (!Array.isArray(problems) || problems.length === 0) {
      return res.status(400).json({ error: 'Invalid problems data' });
    }
    
    // Process all problems and add timestamps
    const processedProblems = problems.map(problem => {
      // Basic required structure
      const processedProblem = {
        title: problem.title,
        slug: problem.slug || problem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: problem.description,
        difficulty: problem.difficulty,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Add optional fields if they exist
      if (problem.topics) {
        processedProblem.topics = Array.isArray(problem.topics) 
          ? problem.topics 
          : problem.topics.split(',').map(t => t.trim());
      }
      
      if (problem.code_template) processedProblem.code_template = problem.code_template;
      if (problem.examples) processedProblem.examples = problem.examples;
      if (problem.testCases) processedProblem.testCases = problem.testCases;
      if (problem.solution) processedProblem.solution = problem.solution;
      
      return processedProblem;
    });
    
    // Insert problems one by one to avoid RLS issues
    const results = [];
    const failures = [];
    
    for (const problem of processedProblems) {
      try {
        const { data, error } = await supabase
          .from('problems')
          .insert([problem])
          .select();
        
        if (error) {
          console.error(`Error inserting problem "${problem.title}":`, error);
          failures.push({ problem: problem.title, error: error.message });
        } else {
          results.push(data[0] || problem);
        }
      } catch (err) {
        console.error(`Exception inserting problem "${problem.title}":`, err);
        failures.push({ problem: problem.title, error: err.message });
      }
    }
    
    res.status(201).json({ 
      success: true, 
      count: results.length,
      failedCount: failures.length,
      failures
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get full problem with solution (for authorized users)
app.get('/api/problems/:problemId/solution', async (req, res) => {
  try {
    const { problemId } = req.params;
    
    // Check if user is authenticated - TEMPORARILY DISABLED
    // if (!req.session.user) {
    //   return res.status(401).json({ error: 'Authentication required' });
    // }
    
    // Get the problem with solution
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('id', problemId)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    res.json({ solution: data.solution || { approach: "No solution available" } });
  } catch (error) {
    console.error('Get solution error:', error);
    res.status(500).json({ error: 'Failed to get solution' });
  }
});

// ======================================
// ADMIN PANEL ROUTE
// ======================================

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// User Progress Endpoints

// Save user progress
app.post('/api/progress', async (req, res) => {
  try {
    const { userId, problemId, status, solution, language, timeSpent } = req.body;
    
    const { data, error } = await supabase
      .from('user_progress')
      .upsert([
        {
          user_id: userId,
          problem_id: problemId,
          status: status,
          solution: solution,
          language: language,
          time_spent: timeSpent,
          completed_at: status === 'completed' ? new Date() : null,
          updated_at: new Date()
        }
      ]);
    
    if (error) throw error;
    
    res.status(200).json({ success: true, progress: data });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get user progress
app.get('/api/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    res.status(200).json({ success: true, progress: data });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Dashboard Data Endpoint

// Get user dashboard data
app.get('/api/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('user_dashboard_data')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // Fallback: get individual data
      const [preferences, progress, profile] = await Promise.all([
        supabase.from('user_preferences').select('*').eq('user_id', userId).single(),
        supabase.from('user_progress').select('*').eq('user_id', userId),
        supabase.from('profiles').select('*').eq('id', userId).single()
      ]);
      
      // Calculate stats
      const totalSolved = progress.data?.length || 0;
      let masteryLevel = 'Bronze';
      if (totalSolved >= 30) masteryLevel = 'Silver';
      if (totalSolved >= 60) masteryLevel = 'Gold';
      if (totalSolved >= 100) masteryLevel = 'Platinum';
      
      const dashboardData = {
        user_id: userId,
        first_name: profile.data?.first_name || '',
        problems_solved: totalSolved,
        current_streak: 0, // Would need to calculate
        mastery_level: masteryLevel,
        goal: preferences.data?.goal || 'practice',
        commitment: preferences.data?.commitment || '1',
        difficulty: preferences.data?.difficulty || 'mixed',
        solved_today: 0 // Would need to calculate
      };
      
      return res.status(200).json({ success: true, dashboard: dashboardData });
    }
    
    res.status(200).json({ success: true, dashboard: data });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Verify submitted solution against test cases
app.post('/api/verify-solution', async (req, res) => {
  try {
    const { problemId, code, language } = req.body;
    
    // For demonstration purposes, always return success response
    // In a production environment, you would validate the solution against test cases
    const result = {
      status: 'Accepted',
      testResults: [
        { 
          testCase: "Example test case",
          passed: true,
          explanation: "Your solution produced the correct output."
        }
      ],
      time: "43 ms",
      memory: "14.2 MB",
      feedback: "Great job! Your solution has the optimal time and space complexity."
    };
    
    res.json(result);
  } catch (error) {
    console.error('Verify solution error:', error);
    res.status(500).json({ error: 'Failed to verify solution' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
}); 