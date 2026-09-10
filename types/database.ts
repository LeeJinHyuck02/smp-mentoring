export interface MentorProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Course {
  id: string;
  mentor_id: string;
  semester: string;
  title: string;
  created_at: string;
}

export interface Section {
  id: string;
  course_id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface SchedulePoll {
  id: string;
  section_id: string;
  title: string;
  dates: string[]; // ['2026-09-15', '2026-09-16', ...]
  start_time: string; // '09:00'
  end_time: string; // '22:00'
  slot_duration: number; // 30
  is_closed: boolean;
  confirmed_slot: {
    date: string;
    start: string;
    end: string;
  } | null;
  created_at: string;
}

export interface ScheduleSubmission {
  id: string;
  poll_id: string;
  participant_name: string;
  pin_hash: string;
  guest_token?: string;
  available_slots: string[]; // ['2026-09-15T09:00', '2026-09-15T09:30']
  updated_at: string;
}

export interface Question {
  id: string;
  section_id: string;
  author_name: string;
  pin_hash: string;
  guest_token?: string;
  title: string;
  content: string;
  image_urls: string[];
  is_secret: boolean;
  is_anonymous: boolean;
  status: 'pending' | 'resolved';
  created_at: string;
}

export interface Answer {
  id: string;
  question_id: string;
  author_name: string;
  is_mentor: boolean;
  content: string;
  created_at: string;
}

export type SurveyQuestionType = 'single_choice' | 'multiple_choice' | 'text' | 'rating';

export interface Survey {
  id: string;
  section_id: string;
  title: string;
  description?: string;
  is_closed: boolean;
  is_anonymous: boolean;
  created_at: string;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: SurveyQuestionType;
  options: string[]; // ["옵션1", "옵션2", ...]
  is_required: boolean;
  order_index: number;
  created_at: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_name: string;
  guest_token?: string;
  created_at: string;
}

export interface SurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  selected_options: string[];
  text_answer?: string;
  rating_value?: number;
  created_at: string;
}


