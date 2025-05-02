-- CheatCode Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profile table for user information
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User preferences table for onboarding data
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL, -- 'interviews', 'learn', 'practice'
  commitment TEXT NOT NULL, -- '1', '3', '5'
  difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard', 'mixed'
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id)
);

-- Users table (extended with learning preferences)
CREATE TABLE users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferred_topics TEXT[] DEFAULT ARRAY['Arrays', 'Strings', 'HashMaps']::TEXT[],
  preferred_difficulty TEXT DEFAULT 'easy', -- 'easy', 'medium', 'hard'
  daily_goal INTEGER DEFAULT 1, -- Number of problems per day
  streak INTEGER DEFAULT 0, -- Current streak
  last_active_date DATE DEFAULT CURRENT_DATE
);

-- Create a trigger to generate profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    new.id, 
    new.email,
    new.raw_user_meta_data->>'firstName',
    new.raw_user_meta_data->>'lastName'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Problems table
CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topics TEXT[] NOT NULL,
  acceptance_rate DECIMAL(5, 2) DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  successful_submissions INTEGER DEFAULT 0,
  code_template JSONB NOT NULL DEFAULT '{
    "python": "def solution():\n    # Your code here\n    pass",
    "javascript": "function solution() {\n    // Your code here\n}",
    "java": "class Solution {\n    public void solution() {\n        // Your code here\n    }\n}",
    "cpp": "#include <iostream>\n\nclass Solution {\npublic:\n    void solution() {\n        // Your code here\n    }\n};"
  }',
  time_limit_ms INTEGER DEFAULT 2000,
  memory_limit_kb INTEGER DEFAULT 262144, -- 256MB
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test cases table
CREATE TABLE test_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected TEXT NOT NULL,
  explanation TEXT,
  is_visible BOOLEAN DEFAULT true, -- false for hidden test cases
  order_index INTEGER NOT NULL, -- To control the order of test cases
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CheatCodes table
CREATE TABLE cheat_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  pattern_name TEXT NOT NULL,
  explanation TEXT NOT NULL,
  code_snippet JSONB NOT NULL, -- Different languages
  is_premium BOOLEAN DEFAULT false,
  credit_cost INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('python', 'javascript', 'java', 'cpp')),
  status TEXT NOT NULL, -- 'Accepted', 'Wrong Answer', 'Time Limit Exceeded', etc.
  time_taken TEXT,
  memory_used TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress table
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('attempted', 'completed')),
  language TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  time_spent INTEGER, -- In seconds
  completed_at TIMESTAMP WITH TIME ZONE,
  last_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, problem_id)
);

-- Create a function to update problem acceptance rate
CREATE OR REPLACE FUNCTION update_problem_acceptance_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE problems
  SET 
    total_submissions = total_submissions + 1,
    successful_submissions = CASE 
      WHEN NEW.status = 'Accepted' THEN successful_submissions + 1
      ELSE successful_submissions
    END,
    acceptance_rate = CASE 
      WHEN total_submissions + 1 = 0 THEN 0
      ELSE (successful_submissions::DECIMAL + CASE WHEN NEW.status = 'Accepted' THEN 1 ELSE 0 END) * 100 / (total_submissions + 1)
    END
  WHERE id = NEW.problem_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating acceptance rate
CREATE TRIGGER update_acceptance_rate
AFTER INSERT ON submissions
FOR EACH ROW
EXECUTE FUNCTION update_problem_acceptance_rate();

-- Topic progress view
CREATE OR REPLACE VIEW user_topic_progress AS
SELECT 
  u.id AS user_id,
  t.topic,
  COUNT(DISTINCT p.id) AS total_problems,
  COUNT(DISTINCT CASE WHEN us.status = 'completed' THEN p.id END) AS solved_problems,
  (COUNT(DISTINCT CASE WHEN us.status = 'completed' THEN p.id END)::DECIMAL / NULLIF(COUNT(DISTINCT p.id), 0) * 100) AS progress_percentage
FROM 
  users u
CROSS JOIN (
  SELECT DISTINCT unnest(topics) AS topic FROM problems
) t
LEFT JOIN problems p ON t.topic = ANY(p.topics)
LEFT JOIN user_stats us ON us.problem_id = p.id AND us.user_id = u.id
GROUP BY u.id, t.topic;

-- Create sample problems and test cases
INSERT INTO problems (title, slug, description, difficulty, topics) VALUES
('Two Sum', 'two-sum', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.', 'easy', ARRAY['Arrays', 'HashMap']),
('Valid Parentheses', 'valid-parentheses', 'Given a string s containing just the characters ''()'', ''{}'' and ''[]'', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets. Open brackets must be closed in the correct order. Every close bracket has a corresponding open bracket of the same type.', 'easy', ARRAY['Strings', 'Stack']),
('Merge Two Sorted Lists', 'merge-two-sorted-lists', 'Merge two sorted linked lists and return it as a sorted list. The list should be made by splicing together the nodes of the first two lists.', 'easy', ARRAY['Linked List', 'Recursion']);

-- Insert test cases for Two Sum
INSERT INTO test_cases (problem_id, input, expected, explanation, is_visible, order_index) VALUES
((SELECT id FROM problems WHERE slug = 'two-sum'), '[2,7,11,15], 9', '[0,1]', 'Because nums[0] + nums[1] == 9, we return [0, 1].', true, 1),
((SELECT id FROM problems WHERE slug = 'two-sum'), '[3,2,4], 6', '[1,2]', NULL, true, 2),
((SELECT id FROM problems WHERE slug = 'two-sum'), '[3,3], 6', '[0,1]', NULL, true, 3),
-- Hidden test cases
((SELECT id FROM problems WHERE slug = 'two-sum'), '[1,5,8,10], 18', '[2,3]', NULL, false, 4),
((SELECT id FROM problems WHERE slug = 'two-sum'), '[-1,-2,-3,-4,-5], -8', '[2,4]', NULL, false, 5);

-- Insert CheatCode for Two Sum
INSERT INTO cheat_codes (problem_id, pattern_name, explanation, code_snippet, is_premium) VALUES
((SELECT id FROM problems WHERE slug = 'two-sum'), 'HashMap Lookup', 'Use a hash map to store visited numbers and their indices. For each number, check if (target - num) is already in the map.', 
'{
  "python": "def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []",
  "javascript": "function twoSum(nums, target) {\n    const seen = {};\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (complement in seen) {\n            return [seen[complement], i];\n        }\n        seen[nums[i]] = i;\n    }\n    return [];\n}",
  "java": "public int[] twoSum(int[] nums, int target) {\n    Map<Integer, Integer> map = new HashMap<>();\n    for (int i = 0; i < nums.length; i++) {\n        int complement = target - nums[i];\n        if (map.containsKey(complement)) {\n            return new int[] { map.get(complement), i };\n        }\n        map.put(nums[i], i);\n    }\n    return new int[0];\n}",
  "cpp": "vector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> seen;\n    for (int i = 0; i < nums.size(); i++) {\n        int complement = target - nums[i];\n        if (seen.count(complement)) {\n            return {seen[complement], i};\n        }\n        seen[nums[i]] = i;\n    }\n    return {};\n}"
}', true);

-- Create indexes for performance
CREATE INDEX idx_user_prefs_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_progress_user_id ON user_stats(user_id);
CREATE INDEX idx_user_progress_problem_id ON user_stats(problem_id);
CREATE INDEX idx_user_activity_user_id ON user_stats(user_id);
CREATE INDEX idx_user_activity_date ON user_stats(completed_at);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);

-- Create function to update updated_at on all tables
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables to update the updated_at column
CREATE TRIGGER update_profiles_modtime
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_user_preferences_modtime
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_problems_modtime
  BEFORE UPDATE ON problems
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_test_cases_modtime
  BEFORE UPDATE ON test_cases
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_cheat_codes_modtime
  BEFORE UPDATE ON cheat_codes
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_user_stats_modtime
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Function to calculate user streak
CREATE OR REPLACE FUNCTION calculate_streak(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  last_activity_date DATE;
  today DATE := CURRENT_DATE;
BEGIN
  -- Get the latest activity date for the user
  SELECT MAX(completed_at) INTO last_activity_date
  FROM user_stats
  WHERE user_id = user_uuid;
  
  -- If no activity or gap is more than 1 day, streak is 0
  IF last_activity_date IS NULL OR (today - last_activity_date) > 1 THEN
    RETURN 0;
  END IF;
  
  -- Count consecutive days with activity
  WITH RECURSIVE streak_count AS (
    SELECT completed_at, 1 as streak
    FROM user_stats
    WHERE user_id = user_uuid AND completed_at = last_activity_date
    
    UNION ALL
    
    SELECT us.completed_at, sc.streak + 1
    FROM streak_count sc
    JOIN user_stats us ON us.completed_at = sc.completed_at - INTERVAL '1 day'
    WHERE us.user_id = user_uuid
  )
  SELECT MAX(streak) INTO current_streak FROM streak_count;
  
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

-- Create view for user dashboard data
CREATE OR REPLACE VIEW user_dashboard_data AS
SELECT 
  p.id as user_id,
  p.first_name,
  p.last_name,
  pref.goal,
  pref.commitment,
  pref.difficulty,
  (
    SELECT COUNT(*) 
    FROM user_stats us 
    WHERE us.user_id = p.id AND us.status = 'completed'
  ) as problems_solved,
  (
    SELECT COUNT(*) 
    FROM user_stats us 
    WHERE us.user_id = p.id AND us.status = 'completed' AND DATE(us.completed_at) = CURRENT_DATE
  ) as solved_today,
  (
    SELECT calculate_streak(p.id)
  ) as current_streak,
  (
    CASE 
      WHEN (SELECT COUNT(*) FROM user_stats us WHERE us.user_id = p.id AND us.status = 'completed') >= 100 THEN 'Platinum'
      WHEN (SELECT COUNT(*) FROM user_stats us WHERE us.user_id = p.id AND us.status = 'completed') >= 60 THEN 'Gold'
      WHEN (SELECT COUNT(*) FROM user_stats us WHERE us.user_id = p.id AND us.status = 'completed') >= 30 THEN 'Silver'
      ELSE 'Bronze'
    END
  ) as mastery_level,
  pref.created_at,
  pref.updated_at
FROM profiles p
JOIN user_preferences pref ON p.id = pref.user_id;

-- Function to record user activity when problem is solved
CREATE OR REPLACE FUNCTION record_problem_solved()
RETURNS TRIGGER AS $$
DECLARE
  today DATE := CURRENT_DATE;
  activity_record_exists BOOLEAN;
BEGIN
  -- Only proceed if status is updated to 'completed'
  IF NEW.status = 'completed' THEN
    -- Check if there's already an activity record for today
    SELECT EXISTS(
      SELECT 1 FROM user_stats 
      WHERE user_id = NEW.user_id AND completed_at = today
    ) INTO activity_record_exists;
    
    IF activity_record_exists THEN
      -- Update existing activity record
      UPDATE user_stats
      SET status = 'completed'
      WHERE user_id = NEW.user_id AND completed_at = today;
    ELSE
      -- Create new activity record
      INSERT INTO user_stats (user_id, problem_id, status, language, completed_at)
      VALUES (NEW.user_id, NEW.problem_id, 'completed', NEW.language, NEW.completed_at);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to record activity when a problem is solved
CREATE TRIGGER record_problem_solved_trigger
  AFTER INSERT OR UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION record_problem_solved();

-- Function to update streak count when activity is recorded
CREATE OR REPLACE FUNCTION update_streak()
RETURNS TRIGGER AS $$
DECLARE
  streak_count INTEGER;
BEGIN
  -- Calculate the current streak for the user
  streak_count := calculate_streak(NEW.user_id);
  
  -- Update the streak day in the activity record
  UPDATE user_stats
  SET streak = streak_count
  WHERE user_id = NEW.user_id AND completed_at = NEW.completed_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update streak when activity is recorded/updated
CREATE TRIGGER update_streak_trigger
  AFTER INSERT OR UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_streak();

-- Create function to get personalized problem recommendations
CREATE OR REPLACE FUNCTION get_recommended_problems(user_uuid UUID, limit_count INTEGER DEFAULT 3)
RETURNS TABLE (
  problem_id UUID,
  slug TEXT,
  title TEXT,
  description TEXT,
  difficulty TEXT,
  topics TEXT[],
  pattern_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_prefs AS (
    SELECT us.difficulty, us.goal
    FROM user_stats us
    WHERE us.user_id = user_uuid
  ),
  
  completed_problems AS (
    SELECT problem_id
    FROM user_stats
    WHERE user_id = user_uuid AND status = 'completed'
  )
  
  SELECT p.id, p.slug, p.title, p.description, p.difficulty, p.topics, pat.name
  FROM problems p
  LEFT JOIN patterns pat ON p.pattern_id = pat.id
  CROSS JOIN user_prefs up
  WHERE 
    -- Filter by user's difficulty preference or mixed
    (up.difficulty = 'mixed' OR p.difficulty = up.difficulty) AND
    -- Filter out already completed problems
    p.id NOT IN (SELECT problem_id FROM completed_problems)
  ORDER BY
    -- Order by pattern frequency based on user's goal
    CASE 
      WHEN up.goal = 'interviews' THEN (
        SELECT COUNT(*) 
        FROM user_stats 
        JOIN problems ON problems.id = user_stats.problem_id
        WHERE user_stats.user_id = user_uuid 
          AND problems.pattern_id = p.pattern_id
          AND user_stats.status = 'completed'
      )
      ELSE 0
    END DESC,
    -- Random order for diversity
    RANDOM()
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheat_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for user_stats
CREATE POLICY "Users can view their own progress"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for problems
CREATE POLICY "Anyone can view problems"
  ON problems FOR SELECT
  USING (true);

-- Create policies for test_cases
CREATE POLICY "Anyone can view test cases"
  ON test_cases FOR SELECT
  USING (true);

-- Create policies for cheat_codes
CREATE POLICY "Anyone can view cheat codes"
  ON cheat_codes FOR SELECT
  USING (true);

-- Insert sample patterns
INSERT INTO patterns (id, name, description, difficulty) VALUES
(uuid_generate_v4(), 'Two Pointers', 'Using two pointers to solve array and string problems efficiently', 'easy'),
(uuid_generate_v4(), 'Sliding Window', 'Technique for finding subarrays or substrings with specific properties', 'medium'),
(uuid_generate_v4(), 'Dynamic Programming', 'Breaking down complex problems into simpler subproblems', 'hard'),
(uuid_generate_v4(), 'Hash Table', 'Using hash maps for O(1) lookups', 'easy'),
(uuid_generate_v4(), 'Binary Search', 'Efficiently finding elements in sorted arrays', 'medium');

-- Get pattern IDs for sample problems
DO $$
DECLARE
  hash_table_id UUID;
BEGIN
  SELECT id INTO hash_table_id FROM patterns WHERE name = 'Hash Table' LIMIT 1;

  -- Insert sample problem data
  INSERT INTO problems (slug, title, description, difficulty, topics, pattern_id, code_template, test_cases, solution_code)
  VALUES
  (
    'two-sum',
    'Two Sum',
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    'easy',
    ARRAY['array', 'hash-table'],
    hash_table_id,
    '{
      "python": "def two_sum(nums, target):\n    # Your code here\n    pass",
      "javascript": "function twoSum(nums, target) {\n    // Your code here\n}"
    }',
    '[
      {"input": {"nums": [2, 7, 11, 15], "target": 9}, "output": [0, 1]},
      {"input": {"nums": [3, 2, 4], "target": 6}, "output": [1, 2]}
    ]',
    '{
      "python": "def two_sum(nums, target):\n    map = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in map:\n            return [map[complement], i]\n        map[num] = i\n    return []",
      "javascript": "function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (map.has(complement)) {\n            return [map.get(complement), i];\n        }\n        map.set(nums[i], i);\n    }\n    return [];\n}"
    }'
  );
END $$; 