# Supabase Database Timeout Issue - Debug Guide

## Problem
Database queries (`getLibraryStats` and `getLibrary`) are starting but never completing, causing 30-second timeouts.

## Evidence
```
Profile.tsx:40 Profile: Starting database fetches...
database.ts:188 Database: getLibraryStats starting...
database.ts:159 Database: getLibrary-history starting...
[30 seconds pass]
Profile.tsx:78 Profile: Error fetching profile data: Error: Request timed out after 30 seconds
```

## Possible Root Causes

### 1. Missing Database Tables
The queries might be failing because the tables don't exist in your Supabase project.

**Required Tables:**
- `profiles` - User profile information
- `episodes` - Podcast episode data
- `user_library` - User's saved/liked/history episodes

### 2. Row Level Security (RLS) Policies
Supabase has RLS enabled by default. If policies aren't configured, queries will hang or fail silently.

**Check RLS Status:**
1. Go to https://bfchuybsseczmjmmosda.supabase.co
2. Navigate to Table Editor
3. Check if `user_library` and `episodes` tables exist
4. Click on each table → "RLS" tab
5. Ensure policies allow SELECT for authenticated users

### 3. Network/Connectivity Issues
The Supabase instance might be unreachable or experiencing issues.

## Recommended Actions

### Option 1: Check Supabase Dashboard (RECOMMENDED)
1. Visit: https://supabase.com/dashboard/project/bfchuybsseczmjmmosda
2. Go to **Table Editor**
3. Verify these tables exist:
   - `profiles`
   - `episodes`
   - `user_library`
4. If tables are missing, create them using the SQL editor

### Option 2: Temporarily Disable Profile Data Fetching
Until the database issue is resolved, you can disable the profile data fetching to prevent the timeout:

**File:** `src/Screen/Dashboard/Profile.tsx`

Replace the `fetchProfileData` function (lines 27-68) with:

```typescript
const fetchProfileData = async () => {
    console.log("Profile: fetchProfileData called. User ID:", user?.id);

    if (!user?.id) {
        console.log("Profile: No user ID found, stopping fetch.");
        setLoading(false);
        return;
    }

    // TEMPORARY: Skip database calls until connectivity issue is resolved
    console.warn("Profile: Database calls disabled - using default values");
    setStats({ likedCount: 0, followingCount: 0 });
    setRecentlyPlayed([]);
    setLoading(false);
};
```

### Option 3: Create Missing Tables
If tables don't exist, run this SQL in Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create episodes table
CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    audio_url TEXT NOT NULL,
    image_url TEXT,
    pub_date TEXT,
    duration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_library table
CREATE TABLE IF NOT EXISTS user_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    episode_id TEXT REFERENCES episodes(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('queue', 'liked', 'history', 'downloaded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, episode_id, status)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_library ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view episodes" ON episodes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view own library" ON user_library
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own library" ON user_library
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own library" ON user_library
    FOR DELETE USING (auth.uid() = user_id);
```

## Next Steps
1. Check your Supabase dashboard to see if tables exist
2. If tables are missing, create them using the SQL above
3. If tables exist, check RLS policies
4. If you need the app working immediately, use Option 2 (temporary disable)
