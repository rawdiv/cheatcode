// Supabase integration for CheatCode
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.8/+esm'

// Initialize Supabase client
const supabaseUrl = 'https://dyiuezrvgafcmgrikilg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aXVlenJ2Z2FmY21ncmlraWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwOTk4NDksImV4cCI6MjA2MTY3NTg0OX0.4mbBNBzLqhGtfl6sgl1HarxvIjo0gy-crWNm4FEASUg'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise} - Supabase auth response
 */
async function registerUser(userData) {
  const { email, password } = userData
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName
      }
    }
  })
  
  if (error) throw error
  
  // Don't try to create profile here - we'll do this after sign-in
  // This avoids the RLS policy issue
  
  return data
}

/**
 * Create user profile in the database
 * @param {string} userId - Supabase auth user id
 * @param {Object} userData - User profile data
 * @returns {Promise} - Supabase insert response
 */
async function createUserProfile(userId, userData) {
  // Extract only the fields we want to store
  const { firstName, lastName, email } = userData
  
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
    ])
  
  if (error) throw error
  return data
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Supabase auth response
 */
async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

/**
 * Get current user session
 * @returns {Promise} - Supabase session
 */
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  
  if (error) throw error
  return data?.user
}

/**
 * Save onboarding data
 * @param {string} userId - User ID
 * @param {Object} onboardingData - User onboarding preferences
 * @returns {Promise} - Supabase insert response
 */
async function saveOnboardingData(userId, onboardingData) {
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert([
      {
        user_id: userId,
        goal: onboardingData.goal,
        commitment: onboardingData.commitment,
        difficulty: onboardingData.difficulty,
        onboarding_completed: true,
        updated_at: new Date()
      }
    ])
  
  if (error) throw error
  return data
}

/**
 * Get user preferences
 * @param {string} userId - User ID
 * @returns {Promise} - User preferences
 */
async function getUserPreferences(userId) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

/**
 * Save user progress for a problem
 * @param {string} userId - User ID
 * @param {string} problemId - Problem ID
 * @param {Object} progressData - Problem progress data
 * @returns {Promise} - Supabase insert response
 */
async function saveUserProgress(userId, problemId, progressData) {
  const { data, error } = await supabase
    .from('user_progress')
    .upsert([
      {
        user_id: userId,
        problem_id: problemId,
        status: progressData.status, // 'completed', 'attempted', etc.
        solution: progressData.solution,
        language: progressData.language,
        time_spent: progressData.timeSpent,
        completed_at: progressData.status === 'completed' ? new Date() : null,
        updated_at: new Date()
      }
    ])
  
  if (error) throw error
  return data
}

/**
 * Get user progress
 * @param {string} userId - User ID
 * @returns {Promise} - User progress for all problems
 */
async function getUserProgress(userId) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
  
  if (error) throw error
  return data
}

/**
 * Sign out user
 * @returns {Promise} - Supabase sign out response
 */
async function signOutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export {
  supabase,
  registerUser,
  loginUser,
  getCurrentUser,
  createUserProfile,
  saveOnboardingData,
  getUserPreferences,
  saveUserProgress,
  getUserProgress,
  signOutUser
} 