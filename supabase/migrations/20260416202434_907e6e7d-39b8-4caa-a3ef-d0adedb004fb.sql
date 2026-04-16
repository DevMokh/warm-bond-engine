-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.age_group AS ENUM ('youth', 'cultured', 'family');
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE public.game_mode AS ENUM ('solo', 'daily', 'multiplayer');

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  age_group public.age_group DEFAULT 'youth',
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- USER ROLES TABLE (security-critical)
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- CATEGORIES TABLE
-- =====================================================
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  icon TEXT,
  age_group public.age_group DEFAULT 'youth',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by everyone"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- QUESTIONS TABLE
-- =====================================================
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  difficulty public.difficulty_level NOT NULL DEFAULT 'medium',
  age_group public.age_group NOT NULL DEFAULT 'youth',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  times_played INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions viewable by authenticated users"
  ON public.questions FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins manage questions"
  ON public.questions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_questions_category ON public.questions(category_id);
CREATE INDEX idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX idx_questions_age_group ON public.questions(age_group);

-- =====================================================
-- ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  xp_reward INTEGER NOT NULL DEFAULT 50,
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by everyone"
  ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Admins manage achievements"
  ON public.achievements FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- USER ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User achievements viewable by everyone"
  ON public.user_achievements FOR SELECT USING (true);

CREATE POLICY "Users can earn own achievements"
  ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- GAME SESSIONS TABLE
-- =====================================================
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode public.game_mode NOT NULL DEFAULT 'solo',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  difficulty public.difficulty_level,
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions"
  ON public.game_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sessions viewable for leaderboard"
  ON public.game_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own sessions"
  ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sessions_user ON public.game_sessions(user_id);
CREATE INDEX idx_sessions_completed ON public.game_sessions(completed_at DESC);

-- =====================================================
-- TIMESTAMP TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SEED DATA: Categories
-- =====================================================
INSERT INTO public.categories (slug, name, name_ar, icon, age_group) VALUES
  ('history', 'History', 'تاريخ', '📜', 'cultured'),
  ('science', 'Science', 'علوم', '🔬', 'youth'),
  ('sports', 'Sports', 'رياضة', '⚽', 'youth'),
  ('general', 'General Knowledge', 'ثقافة عامة', '🌍', 'youth'),
  ('religion', 'Religion', 'دين', '🕌', 'cultured'),
  ('geography', 'Geography', 'جغرافيا', '🗺️', 'youth'),
  ('art', 'Art', 'فن', '🎨', 'cultured'),
  ('tech', 'Technology', 'تكنولوجيا', '💻', 'youth'),
  ('kids', 'Kids', 'أطفال', '🧸', 'family');

-- =====================================================
-- SEED DATA: Achievements
-- =====================================================
INSERT INTO public.achievements (slug, name_ar, description_ar, icon, xp_reward, condition_type, condition_value) VALUES
  ('first_win', 'أول فوز', 'فزت بأول لعبة!', '🥇', 100, 'games_won', 1),
  ('streak_10', 'سلسلة الـ 10', '10 إجابات صحيحة متتالية', '🔥', 150, 'correct_streak', 10),
  ('games_10', 'لاعب نشط', 'لعبت 10 ألعاب', '🎮', 100, 'games_played', 10),
  ('games_50', 'محترف', 'لعبت 50 لعبة', '🎯', 250, 'games_played', 50),
  ('games_100', 'أسطورة', 'لعبت 100 لعبة', '👑', 500, 'games_played', 100),
  ('xp_1000', 'ألف نقطة', 'وصلت لـ 1000 XP', '⭐', 200, 'total_xp', 1000),
  ('xp_5000', 'خمسة آلاف', 'وصلت لـ 5000 XP', '🌟', 500, 'total_xp', 5000),
  ('level_5', 'مستوى 5', 'وصلت للمستوى 5', '🎖️', 200, 'level', 5),
  ('level_10', 'مستوى 10', 'وصلت للمستوى 10', '🏅', 400, 'level', 10),
  ('perfect_game', 'لعبة مثالية', 'إجابات صح 100%', '💯', 300, 'perfect_score', 1),
  ('night_owl', 'محارب ليلي', 'لعبت بعد منتصف الليل', '🦉', 100, 'night_play', 1),
  ('history_master', 'ملك التاريخ', 'فزت بـ 5 ألعاب تاريخ', '📚', 250, 'category_wins_history', 5),
  ('science_master', 'عالم', 'فزت بـ 5 ألعاب علوم', '🧪', 250, 'category_wins_science', 5),
  ('sports_master', 'بطل الرياضة', 'فزت بـ 5 ألعاب رياضة', '🏆', 250, 'category_wins_sports', 5),
  ('daily_3', 'متابع يومي', 'لعبت التحدي اليومي 3 أيام', '📅', 150, 'daily_streak', 3),
  ('daily_7', 'أسبوع كامل', 'لعبت التحدي اليومي 7 أيام', '🗓️', 350, 'daily_streak', 7),
  ('first_friend', 'صديق جديد', 'أضفت أول صديق', '🤝', 50, 'friends_count', 1),
  ('social_5', 'اجتماعي', 'وصلت لـ 5 أصدقاء', '👥', 150, 'friends_count', 5),
  ('room_winner', 'فائز الغرف', 'فزت بأول غرفة جماعية', '🎊', 200, 'room_wins', 1),
  ('room_master', 'سيد الغرف', 'فزت بـ 5 غرف جماعية', '👑', 500, 'room_wins', 5);