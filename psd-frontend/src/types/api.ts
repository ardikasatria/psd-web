import { z } from 'zod'

export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  page_size: number
}

export const Paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
  })

export const OwnerRefSchema = z.object({
  username: z.string(),
  type: z.enum(['user', 'org']),
  avatar_url: z.string().nullable(),
  is_official: z.boolean().optional(),
})
export type OwnerRef = z.infer<typeof OwnerRefSchema>

export const CategoryRefSchema = z.object({
  slug: z.string(),
  name: z.string(),
})
export type CategoryRef = z.infer<typeof CategoryRefSchema>

export const CategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  subcategory_count: z.number().optional(),
})
export type Category = z.infer<typeof CategorySchema>

export const SubcategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
})
export type Subcategory = z.infer<typeof SubcategorySchema>

export const CategoryDetailSchema = CategorySchema.extend({
  subcategories: z.array(SubcategorySchema),
})
export type CategoryDetail = z.infer<typeof CategoryDetailSchema>

export const LinkItemSchema = z.object({
  label: z.string(),
  url: z.string(),
})
export type LinkItem = z.infer<typeof LinkItemSchema>

export const TierSchema = z.object({
  level: z.number(),
  name: z.string(),
  reputation: z.number(),
  next_at: z.number().nullable(),
})
export type Tier = z.infer<typeof TierSchema>

export const ProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  avatar_url: z.string().nullable(),
  banner_url: z.string().nullable(),
  accent_color: z.string().nullable(),
  pronouns: z.string().nullable(),
  location: z.string().nullable(),
  bio: z.string().nullable(),
  about_md: z.string().nullable(),
  status_emoji: z.string().nullable(),
  status_text: z.string().nullable(),
  links: z.array(LinkItemSchema).default([]),
  interests: z.array(z.string()).default([]),
  onboarded: z.boolean().default(false),
  is_official: z.boolean().default(false),
  account_type: z.enum(['individual', 'organization']).default('individual'),
  is_instructor: z.boolean().default(false),
  role: z.enum(['member', 'moderator', 'superadmin']),
  email_verified: z.boolean().default(false),
  accepted_tos_version: z.string().nullable().optional(),
  tos_current: z.string().optional(),
  created_at: z.string(),
  reputation: z.number().optional(),
  tier: TierSchema.optional(),
  badges: z.array(z.string()).optional(),
})
export type Profile = z.infer<typeof ProfileSchema>

export const OkResponseSchema = z.object({ ok: z.boolean() })
export type OkResponse = z.infer<typeof OkResponseSchema>

export const UserSchema = ProfileSchema
export type User = Profile

export const UserStatsSchema = z.object({
  projects: z.number(),
  datasets: z.number(),
  models: z.number(),
  followers: z.number(),
})
export type UserStats = z.infer<typeof UserStatsSchema>

export const PerksSchema = z.object({
  upload_max_mb: z.number(),
  daily_submission_bonus: z.number(),
  notebook_quota: z.number(),
  event_priority: z.boolean(),
  can_create_event: z.boolean(),
  daily_post_limit: z.number(),
  post_image_max: z.number(),
})
export type Perks = z.infer<typeof PerksSchema>

export const BadgeDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(['bronze', 'silver', 'gold']),
  description: z.string(),
  earned: z.boolean(),
})
export type BadgeDef = z.infer<typeof BadgeDefSchema>

export const GamificationSchema = z.object({
  tier: TierSchema,
  perks: PerksSchema,
  badges: z.array(BadgeDefSchema),
})
export type Gamification = z.infer<typeof GamificationSchema>

export const ContributorRowSchema = z.object({
  rank: z.number(),
  reputation: z.number(),
  tier: z.string(),
  user: OwnerRefSchema,
})
export type ContributorRow = z.infer<typeof ContributorRowSchema>

export const PaginatedContributorSchema = Paginated(ContributorRowSchema)
export type PaginatedContributor = z.infer<typeof PaginatedContributorSchema>

export const UserProfileSchema = ProfileSchema.extend({
  stats: UserStatsSchema,
  followers_count: z.number().optional(),
  following_count: z.number().optional(),
  is_following: z.boolean().optional(),
})
export type UserProfile = z.infer<typeof UserProfileSchema>

export const SocialPostAssetSchema = z.object({
  kind: z.string(),
  slug: z.string(),
})

export const SocialPostSchema = z.object({
  id: z.string(),
  author: OwnerRefSchema,
  body_md: z.string(),
  images: z.array(z.string()),
  asset: SocialPostAssetSchema.nullable(),
  like_count: z.number(),
  comment_count: z.number(),
  liked: z.boolean(),
  created_at: z.string(),
})
export type SocialPost = z.infer<typeof SocialPostSchema>

export const SocialCommentSchema = z.object({
  id: z.string(),
  author: OwnerRefSchema,
  body_md: z.string(),
  created_at: z.string(),
})
export type SocialComment = z.infer<typeof SocialCommentSchema>

export const PaginatedSocialPostSchema = Paginated(SocialPostSchema)
export type PaginatedSocialPost = z.infer<typeof PaginatedSocialPostSchema>

export const FeedHotPostSchema = z.object({
  id: z.string(),
  author: OwnerRefSchema,
  preview: z.string(),
  like_count: z.number(),
  comment_count: z.number(),
  created_at: z.string(),
})
export type FeedHotPost = z.infer<typeof FeedHotPostSchema>

export const FeedStatsSchema = z.object({
  total_posts: z.number(),
  total_likes: z.number(),
  active_this_week: z.number(),
  trending_tags: z.array(z.object({ tag: z.string(), count: z.number() })),
  hot_posts: z.array(FeedHotPostSchema),
  people_of_week: z.array(
    z.object({
      user: OwnerRefSchema,
      score: z.number(),
    }),
  ),
  suggested_follows: z.array(
    z.object({
      user: OwnerRefSchema,
      followers: z.number(),
    }),
  ),
})
export type FeedStats = z.infer<typeof FeedStatsSchema>

export const PaginatedSocialCommentSchema = Paginated(SocialCommentSchema)
export type PaginatedSocialComment = z.infer<typeof PaginatedSocialCommentSchema>

export const PaginatedOwnerSchema = Paginated(OwnerRefSchema)
export type PaginatedOwner = z.infer<typeof PaginatedOwnerSchema>

export const LikePostResponseSchema = z.object({
  liked: z.boolean(),
  like_count: z.number(),
})
export type LikePostResponse = z.infer<typeof LikePostResponseSchema>

export const FollowResponseSchema = z.object({ following: z.boolean() })
export type FollowResponse = z.infer<typeof FollowResponseSchema>

export const PostImageUploadSchema = z.object({ url: z.string() })

export const ProfileUpdateSchema = ProfileSchema.pick({
  name: true,
  bio: true,
  about_md: true,
  pronouns: true,
  location: true,
  accent_color: true,
  status_emoji: true,
  status_text: true,
  links: true,
  interests: true,
}).partial()
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>

export const OnboardingChecklistSchema = z.object({
  profile_completed: z.boolean(),
  email_verified: z.boolean(),
  interests_selected: z.boolean(),
  has_asset: z.boolean(),
  joined_competition: z.boolean(),
  joined_discussion: z.boolean(),
})

export const OnboardingSchema = z.object({
  onboarded: z.boolean(),
  interests: z.array(z.string()),
  checklist: OnboardingChecklistSchema,
})
export type Onboarding = z.infer<typeof OnboardingSchema>

export const SettingsNotificationsSchema = z.object({
  email_event_reminder: z.boolean(),
  email_competition: z.boolean(),
  email_forum_reply: z.boolean(),
  inapp: z.boolean(),
})

export const SettingsEmailSchema = z.object({
  email_enabled: z.boolean(),
  default_mode: z.enum(['immediate', 'digest', 'off']),
  events: z.record(z.enum(['immediate', 'digest', 'off'])).optional(),
})
export type SettingsEmail = z.infer<typeof SettingsEmailSchema>

export const SettingsPrivacySchema = z.object({
  profile_visibility: z.enum(['public', 'private']),
  show_email: z.boolean(),
  searchable: z.boolean(),
  activity_tracking: z.boolean(),
})

export const SettingsAppearanceSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  language: z.enum(['id', 'en']),
  reduced_motion: z.boolean(),
})
export type SettingsAppearance = z.infer<typeof SettingsAppearanceSchema>

export const SettingsSchema = z.object({
  notifications: SettingsNotificationsSchema,
  email: SettingsEmailSchema,
  privacy: SettingsPrivacySchema,
  appearance: SettingsAppearanceSchema,
})
export type Settings = z.infer<typeof SettingsSchema>
export type SettingsPatch = {
  notifications?: Partial<Settings['notifications']>
  email?: Partial<Settings['email']>
  privacy?: Partial<Settings['privacy']>
  appearance?: Partial<Settings['appearance']>
}

export const OnboardingCompleteSchema = z.object({ onboarded: z.boolean() })

export const AvatarUploadSchema = z.object({ avatar_url: z.string() })
export const BannerUploadSchema = z.object({ banner_url: z.string() })

export const AuthResponseSchema = z.object({
  user: ProfileSchema,
  token: z.string(),
})
export type AuthResponse = z.infer<typeof AuthResponseSchema>

export const MeResponseSchema = z.object({
  user: ProfileSchema,
})
export type MeResponse = z.infer<typeof MeResponseSchema>

export const MemberCardResponseSchema = z.object({
  share_token: z.string(),
  share_url: z.string().url(),
})
export type MemberCardResponse = z.infer<typeof MemberCardResponseSchema>

export const ShareResolveSchema = z.object({
  username: z.string(),
  profile_url: z.string(),
})
export type ShareResolve = z.infer<typeof ShareResolveSchema>

export const RepoKindSchema = z.enum(['project', 'dataset', 'model'])
export type RepoKind = z.infer<typeof RepoKindSchema>

export const TeamRefSchema = z.object({
  slug: z.string(),
  name: z.string(),
})
export type TeamRef = z.infer<typeof TeamRefSchema>

export const RepoSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  kind: RepoKindSchema,
  owner: OwnerRefSchema,
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  likes: z.number(),
  downloads: z.number(),
  visibility: z.enum(['public', 'private']),
  featured: z.boolean().optional(),
  updated_at: z.string(),
  category: CategoryRefSchema.nullable().optional(),
  subcategory: CategoryRefSchema.nullable().optional(),
  team: TeamRefSchema.nullable().optional(),
  synthetic: z.boolean().optional(),
  generation_spec: z.record(z.unknown()).nullable().optional(),
  clone_url: z.string().nullable().optional(),
  source_of_truth: z.string().optional(),
  metrics_preview: z.record(z.string(), z.number()).optional(),
  dataset_preview: z
    .object({
      rows: z.number().optional(),
      columns: z.number().optional(),
      format: z.string().optional(),
      size_mb: z.number().optional(),
    })
    .optional(),
  project_preview: z
    .object({
      stack: z.array(z.string()).optional(),
      assets_count: z.number().optional(),
      has_demo: z.boolean().optional(),
    })
    .optional(),
})
export type RepoSummary = z.infer<typeof RepoSummarySchema>

export const RepoFileSchema = z.object({
  path: z.string(),
  size_bytes: z.number(),
  type: z.string(),
  url: z.string(),
})
export type RepoFile = z.infer<typeof RepoFileSchema>

export const FromRoomRefSchema = z.object({
  slug: z.string(),
  title: z.string(),
})
export type FromRoomRef = z.infer<typeof FromRoomRefSchema>

export const RepoDetailSchema = RepoSummarySchema.extend({
  readme_md: z.string(),
  files: z.array(RepoFileSchema),
  license: z.string().nullable(),
  metrics: z.record(z.string(), z.number()).optional(),
  liked: z.boolean().default(false),
  from_room: FromRoomRefSchema.nullable().optional(),
})
export type RepoDetail = z.infer<typeof RepoDetailSchema>

export const RepoLikeResponseSchema = z.object({
  liked: z.boolean(),
  likes: z.number(),
})
export type RepoLikeResponse = z.infer<typeof RepoLikeResponseSchema>
export const LikeResultSchema = RepoLikeResponseSchema
export type LikeResult = RepoLikeResponse

export const SlugResponseSchema = z.object({ slug: z.string() })
export type SlugResponse = z.infer<typeof SlugResponseSchema>

export const AdminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['member', 'moderator', 'superadmin']),
  is_active: z.boolean(),
  created_at: z.string(),
})
export type AdminUser = z.infer<typeof AdminUserSchema>

export const AdminStatsSchema = z.object({
  users: z.number(),
  repos: z.number(),
  competitions: z.number(),
  events: z.number(),
  courses: z.number(),
  threads: z.number(),
})
export type AdminStats = z.infer<typeof AdminStatsSchema>

export const PaginatedAdminUserSchema = Paginated(AdminUserSchema)
export type PaginatedAdminUser = PaginatedResult<AdminUser>

export const PaginatedRepoSummarySchema = Paginated(RepoSummarySchema)
export type PaginatedRepoSummary = PaginatedResult<RepoSummary>

export const SearchResultSchema = z.object({
  repos: z.array(z.record(z.unknown())),
  competitions: z.array(z.record(z.unknown())),
})
export type SearchResult = z.infer<typeof SearchResultSchema>

export const DiscoverSchema = z.object({
  featured: z.array(RepoSummarySchema),
  recent: z.array(RepoSummarySchema),
})
export type Discover = z.infer<typeof DiscoverSchema>

export const NotebookSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  owner: OwnerRefSchema,
  tags: z.array(z.string()),
  category: CategoryRefSchema.nullable().optional(),
  subcategory: CategoryRefSchema.nullable().optional(),
  team: TeamRefSchema.nullable().optional(),
  description_preview: z.string().optional(),
  has_colab: z.boolean().optional(),
})
export type NotebookSummary = z.infer<typeof NotebookSummarySchema>

export const NotebookDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  owner: OwnerRefSchema,
  source_url: z.string().nullable(),
  colab_url: z.string().nullable(),
  category: CategoryRefSchema.nullable().optional(),
  subcategory: CategoryRefSchema.nullable().optional(),
  team: TeamRefSchema.nullable().optional(),
})
export type NotebookDetail = z.infer<typeof NotebookDetailSchema>

export const PaginatedNotebookSummarySchema = Paginated(NotebookSummarySchema)
export type PaginatedNotebookSummary = PaginatedResult<NotebookSummary>

export const TeamMemberSchema = z.object({
  username: z.string(),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  role: z.string(),
})
export type TeamMember = z.infer<typeof TeamMemberSchema>

export const TeamSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
  member_count: z.number().optional(),
  focus: z.string().optional(),
  assets_count: z.number().optional(),
  competitions_count: z.number().optional(),
  member_preview: z
    .array(z.object({ username: z.string(), avatar_url: z.string().nullable() }))
    .optional(),
})
export type TeamSummary = z.infer<typeof TeamSummarySchema>

export const TeamSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  avatar_url: z.string().nullable(),
  visibility: z.enum(['public', 'private']),
  my_role: z.enum(['owner', 'admin', 'member']).nullable().optional(),
  members: z.array(TeamMemberSchema),
})
export type Team = z.infer<typeof TeamSchema>

export const MyTeamSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  role: z.enum(['owner', 'admin', 'member']),
})
export type MyTeam = z.infer<typeof MyTeamSchema>

export const TeamInviteSchema = z.object({
  id: z.string(),
  team: TeamRefSchema,
})
export type TeamInvite = z.infer<typeof TeamInviteSchema>

export const TeamJoinRequestSchema = z.object({
  id: z.string(),
  user: z.object({
    username: z.string(),
    name: z.string().nullable(),
    avatar_url: z.string().nullable(),
  }),
})
export type TeamJoinRequest = z.infer<typeof TeamJoinRequestSchema>

export const PaginatedTeamSummarySchema = Paginated(TeamSummarySchema)
export type PaginatedTeamSummary = PaginatedResult<TeamSummary>

export const SynthQuotaSchema = z.object({
  plans_per_day: z.number(),
  plans_used: z.number(),
  plans_left: z.number(),
  max_rows: z.number(),
})
export type SynthQuota = z.infer<typeof SynthQuotaSchema>

export const SynthJobSchema = z.object({
  id: z.string(),
  status: z.enum(['queued', 'planning', 'generating', 'done', 'failed']),
  prompt: z.string().nullable(),
  spec: z.any().nullable(),
  n_rows: z.number(),
  result_url: z.string().nullable(),
  preview: z.array(z.record(z.string())).nullable(),
  dataset_slug: z.string().nullable(),
  error: z.string().nullable(),
})
export type SynthJob = z.infer<typeof SynthJobSchema>

export const SynthJobCreateResponseSchema = z.object({
  job_id: z.string(),
  status: z.string(),
})

export const RoomStatusSchema = z.enum([
  'draft',
  'open',
  'framing',
  'closed',
  'generating',
  'solving',
  'submitted',
  'finished',
  'challenged',
])
export type RoomStatus = z.infer<typeof RoomStatusSchema>

export const ComponentKindSchema = z.enum(['context', 'constraint', 'goal', 'data_need', 'metric'])
export type ComponentKind = z.infer<typeof ComponentKindSchema>

export const RoomMemberSchema = z.object({
  username: z.string(),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  role: z.string(),
})
export type RoomMember = z.infer<typeof RoomMemberSchema>

export const RoomSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  status: RoomStatusSchema,
  member_count: z.number(),
  max_members: z.number().nullable(),
  framing_deadline: z.string().nullable(),
  cover_url: z.string().nullable().optional(),
  category: CategoryRefSchema.nullable().optional(),
  subcategory: CategoryRefSchema.nullable().optional(),
  pitch_preview: z.string().optional(),
  components_count: z.number().optional(),
})
export type RoomSummary = z.infer<typeof RoomSummarySchema>

export const RoomSchema = RoomSummarySchema.extend({
  pitch_md: z.string().optional(),
  team_slug: z.string().optional(),
  team_id: z.string().optional(),
  my_role: z.string().nullable().optional(),
  components_count: z.number().optional(),
  data_mode: z.string().nullable().optional(),
  dataset_repo_slug: z.string().nullable().optional(),
  generation_error: z.string().nullable().optional(),
  competition_slug: z.string().nullable().optional(),
  members: z.array(RoomMemberSchema).optional(),
})
export type IdeaRoom = z.infer<typeof RoomSchema>

export const RoomAssetSchema = z.object({
  type: z.string(),
  slug: z.string(),
  name: z.string(),
  visibility: z.string(),
  synthetic: z.boolean(),
})
export type RoomAsset = z.infer<typeof RoomAssetSchema>

export const SolutionTemplateSchema = z.object({
  sections: z.array(z.object({ key: z.string(), title: z.string() })),
})
export type SolutionTemplate = z.infer<typeof SolutionTemplateSchema>

export const RoomSubmissionSchema = z.object({
  result_summary_md: z.string(),
  notebook_id: z.string().nullable(),
  asset_refs: z.array(z.object({ type: z.string(), slug: z.string() })),
  metrics: z.record(z.any()),
  submitted_by: z.string(),
})
export type RoomSubmission = z.infer<typeof RoomSubmissionSchema>

export const RoomProblemSchema = z.object({
  statement_md: z.string(),
  suggested_metric: z.string().nullable(),
  data_kind: z.enum(['structured', 'unstructured']),
  data_spec: z.any().nullable(),
  unstructured_guidance_md: z.string().nullable(),
  generated_by: z.string(),
})
export type RoomProblem = z.infer<typeof RoomProblemSchema>

export const ProblemComponentSchema = z.object({
  id: z.string(),
  kind: ComponentKindSchema,
  content_md: z.string(),
  author: z.object({
    username: z.string(),
    avatar_url: z.string().nullable(),
  }),
})
export type ProblemComponent = z.infer<typeof ProblemComponentSchema>

export const PaginatedRoomSummarySchema = Paginated(RoomSummarySchema)
export type PaginatedRoomSummary = PaginatedResult<RoomSummary>

export const CourseStatusSchema = z.enum(['draft', 'pending_review', 'published', 'rejected'])
export type CourseStatus = z.infer<typeof CourseStatusSchema>

export const CourseSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  level: z.enum(['pemula', 'menengah', 'mahir']),
  lessons_count: z.number(),
  cover_url: z.string().nullable(),
  status: CourseStatusSchema.optional(),
  review_note: z.string().nullable().optional(),
  author: OwnerRefSchema.nullish(),
  category: CategoryRefSchema.nullable().optional(),
  subcategory: CategoryRefSchema.nullable().optional(),
})
export type CourseSummary = z.infer<typeof CourseSummarySchema>

export const LessonMaterialSchema = z.object({
  name: z.string(),
  url: z.string(),
  size_bytes: z.number(),
  type: z.string(),
})
export type LessonMaterial = z.infer<typeof LessonMaterialSchema>

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  answer_index: z.number().optional(),
  explanation: z.string().optional().nullable(),
})
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>

export const CourseLessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z
    .enum(['reading', 'video', 'quiz'])
    .nullish()
    .transform((v) => v ?? 'reading'),
  duration_min: z.number().optional().default(0),
  content_md: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  materials: z.array(LessonMaterialSchema).optional(),
  quiz: z.array(QuizQuestionSchema).optional(),
  locked: z.boolean().optional(),
})
export type CourseLesson = z.infer<typeof CourseLessonSchema>

export const CourseModuleSchema = z.object({
  title: z.string(),
  lessons: z.array(CourseLessonSchema),
})

export const CourseStatsSchema = z.object({
  enrolled: z.number(),
  completed: z.number(),
  lessons: z.number(),
  completion_rate: z.number(),
})
export type CourseStats = z.infer<typeof CourseStatsSchema>

export const CourseDetailSchema = CourseSummarySchema.extend({
  description: z.string(),
  requirements_md: z.string().nullable().optional(),
  total_duration_min: z.number().optional().default(0),
  modules: z.array(CourseModuleSchema),
  publisher: OwnerRefSchema.nullish(),
  enrolled: z.boolean().default(false),
  access_type: z.enum(['lifetime', 'limited']).default('lifetime'),
  access_days: z.number().nullable().optional(),
  access_status: z.enum(['none', 'active', 'expired']).default('none'),
  stats: CourseStatsSchema,
})
export type CourseDetail = z.infer<typeof CourseDetailSchema>

export const EnrollResponseSchema = z.object({
  enrolled: z.boolean(),
  expires_at: z.string().nullable().optional(),
})
export type EnrollResponse = z.infer<typeof EnrollResponseSchema>

export const CourseLearnerSchema = z.object({
  user: z.object({
    username: z.string(),
    name: z.string(),
    avatar_url: z.string().nullable(),
  }),
  enrolled_at: z.string(),
  expires_at: z.string().nullable(),
  completed: z.number(),
  total: z.number(),
  percent: z.number(),
})
export type CourseLearner = z.infer<typeof CourseLearnerSchema>

export const PaginatedCourseLearnerSchema = Paginated(CourseLearnerSchema)
export type PaginatedCourseLearner = PaginatedResult<CourseLearner>

export const QuizReviewItemSchema = z.object({
  id: z.string(),
  correct_index: z.number().optional(),
  explanation: z.string().nullable().optional(),
})

export const QuizResultSchema = z.object({
  score: z.number(),
  correct: z.number(),
  total: z.number(),
  passed: z.boolean(),
  review: z.array(QuizReviewItemSchema),
})
export type QuizResult = z.infer<typeof QuizResultSchema>

export const UploadedMaterialSchema = LessonMaterialSchema
export type UploadedMaterial = LessonMaterial

export const CourseReviewItemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  level: z.string(),
  author: OwnerRefSchema.nullable(),
})
export type CourseReviewItem = z.infer<typeof CourseReviewItemSchema>

export const PaginatedCourseReviewSchema = Paginated(CourseReviewItemSchema)
export type PaginatedCourseReview = PaginatedResult<CourseReviewItem>

export const LearningProgressSchema = z.object({
  course: z.object({
    slug: z.string(),
    title: z.string(),
    cover_url: z.string().nullable(),
    level: z.enum(['pemula', 'menengah', 'mahir']),
  }),
  completed: z.number(),
  total: z.number(),
  percent: z.number(),
  next_lesson_id: z.string().nullable(),
  expires_at: z.string().nullable().optional(),
  expired: z.boolean().optional().default(false),
})
export type LearningProgress = z.infer<typeof LearningProgressSchema>

export const MyLearningSchema = z.object({
  items: z.array(LearningProgressSchema),
})
export type MyLearning = z.infer<typeof MyLearningSchema>

export const InstructorApplicationSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  expertise: z.string(),
})
export type InstructorApplication = z.infer<typeof InstructorApplicationSchema>

export const AdminInstructorApplicationSchema = z.object({
  id: z.string(),
  expertise: z.string(),
  motivation_md: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  user: z.object({ username: z.string(), name: z.string() }),
})
export type AdminInstructorApplication = z.infer<typeof AdminInstructorApplicationSchema>

export const PaginatedAdminInstructorApplicationSchema = Paginated(AdminInstructorApplicationSchema)
export type PaginatedAdminInstructorApplication = PaginatedResult<AdminInstructorApplication>

export const PaginatedCourseSummarySchema = Paginated(CourseSummarySchema)
export type PaginatedCourseSummary = PaginatedResult<CourseSummary>

export const PathPhaseSchema = z.enum(['belajar', 'buktikan', 'berpeluang'])
export type PathPhase = z.infer<typeof PathPhaseSchema>

export const PathItemTypeSchema = z.enum([
  'course',
  'dataset',
  'model',
  'project',
  'notebook',
  'idea_room',
  'competition',
  'event',
])
export type PathItemType = z.infer<typeof PathItemTypeSchema>

export const PathItemSchema = z.object({
  phase: PathPhaseSchema,
  type: PathItemTypeSchema,
  ref: z.string(),
  title: z.string().optional(),
  note: z.string().optional(),
})
export type PathItem = z.infer<typeof PathItemSchema>

export const PathPhaseCountsSchema = z.object({
  belajar: z.number(),
  buktikan: z.number(),
  berpeluang: z.number(),
})
export type PathPhaseCounts = z.infer<typeof PathPhaseCountsSchema>

export const LearningPathSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  courses_count: z.number(),
  description: z.string(),
  items_count: z.number().optional(),
  phase_counts: PathPhaseCountsSchema.optional(),
})
export type LearningPathSummary = z.infer<typeof LearningPathSummarySchema>

export const LearningPathDetailSchema = LearningPathSummarySchema.extend({
  course_slugs: z.array(z.string()),
  items: z.array(PathItemSchema).default([]),
})
export type LearningPathDetail = z.infer<typeof LearningPathDetailSchema>

export const PaginatedLearningPathSummarySchema = Paginated(LearningPathSummarySchema)
export type PaginatedLearningPathSummary = PaginatedResult<LearningPathSummary>

export const ForumReactionSummarySchema = z.object({
  emoji: z.string(),
  count: z.number(),
  reacted: z.boolean(),
})
export type ForumReactionSummary = z.infer<typeof ForumReactionSummarySchema>

export const ForumEngagementSchema = z.object({
  score: z.number().default(0),
  upvotes: z.number().default(0),
  downvotes: z.number().default(0),
  user_vote: z.union([z.literal(1), z.literal(-1)]).nullable().default(null),
  reactions: z.array(ForumReactionSummarySchema).default([]),
})
export type ForumEngagement = z.infer<typeof ForumEngagementSchema>

export const ForumEngagementResponseSchema = ForumEngagementSchema
export type ForumEngagementResponse = z.infer<typeof ForumEngagementResponseSchema>

export const ThreadSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  author: OwnerRefSchema,
  tags: z.array(z.string()),
  replies: z.number(),
  created_at: z.string(),
  last_activity_at: z.string(),
  score: z.number().default(0),
  upvotes: z.number().default(0),
  downvotes: z.number().default(0),
  user_vote: z.union([z.literal(1), z.literal(-1)]).nullable().default(null),
  reactions: z.array(ForumReactionSummarySchema).default([]),
})
export type ThreadSummary = z.infer<typeof ThreadSummarySchema>

export const PostSchema = z.object({
  id: z.string(),
  author: OwnerRefSchema,
  body_md: z.string(),
  created_at: z.string(),
  score: z.number().default(0),
  upvotes: z.number().default(0),
  downvotes: z.number().default(0),
  user_vote: z.union([z.literal(1), z.literal(-1)]).nullable().default(null),
  reactions: z.array(ForumReactionSummarySchema).default([]),
})
export type Post = z.infer<typeof PostSchema>

export const ThreadDetailSchema = ThreadSummarySchema.extend({
  body_md: z.string(),
  posts: z.array(PostSchema),
})
export type ThreadDetail = z.infer<typeof ThreadDetailSchema>

export const PaginatedThreadSummarySchema = Paginated(ThreadSummarySchema)
export type PaginatedThreadSummary = PaginatedResult<ThreadSummary>

export const ForumStatsSchema = z.object({
  total_threads: z.number(),
  total_replies: z.number(),
  active_this_week: z.number(),
  trending_tags: z.array(z.object({ tag: z.string(), count: z.number() })),
  hot_threads: z.array(ThreadSummarySchema),
  people_of_week: z.array(
    z.object({
      user: OwnerRefSchema,
      score: z.number(),
    }),
  ),
})
export type ForumStats = z.infer<typeof ForumStatsSchema>

export const CreateReplyBodySchema = z.object({
  body_md: z.string().min(1),
})

export const CompetitionSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  sponsor: z.string().nullable(),
  status: z.enum(['active', 'upcoming', 'past']),
  metric: z.string(),
  participants: z.number(),
  prize_pool: z.string().nullable(),
  starts_at: z.string(),
  ends_at: z.string(),
  cover_url: z.string().nullable(),
  featured: z.boolean().optional(),
  category: CategoryRefSchema.nullable().optional(),
  subcategory: CategoryRefSchema.nullable().optional(),
})
export type CompetitionSummary = z.infer<typeof CompetitionSummarySchema>

export const CompetitionPrizeSchema = z.object({
  rank: z.number(),
  reward: z.string(),
})

export const CompetitionDetailSchema = CompetitionSummarySchema.extend({
  overview_md: z.string(),
  rules_md: z.string(),
  dataset_info_md: z.string(),
  prizes: z.array(CompetitionPrizeSchema),
  tags: z.array(z.string()),
  daily_submission_limit: z.number(),
})
export type CompetitionDetail = z.infer<typeof CompetitionDetailSchema>

export const CompetitionProposalStatusSchema = z.enum([
  'draft',
  'pending_review',
  'revision_requested',
  'approved',
  'rejected',
])
export type CompetitionProposalStatus = z.infer<typeof CompetitionProposalStatusSchema>

export const CompetitionProposalSchema = z.object({
  id: z.string(),
  proposed_slug: z.string(),
  title: z.string(),
  sponsor: z.string().nullable().optional(),
  metric: z.string(),
  prize_pool: z.string().nullable().optional(),
  starts_at: z.string(),
  ends_at: z.string(),
  cover_url: z.string().nullable().optional(),
  overview_md: z.string(),
  rules_md: z.string(),
  dataset_info_md: z.string(),
  daily_submission_limit: z.number(),
  category: CategorySchema.nullable().optional(),
  subcategory: SubcategorySchema.nullable().optional(),
  status: CompetitionProposalStatusSchema,
  review_note: z.string().nullable().optional(),
  competition_slug: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  submitted_at: z.string().nullable().optional(),
  user: z.object({ username: z.string(), name: z.string() }).optional(),
})
export type CompetitionProposal = z.infer<typeof CompetitionProposalSchema>

export const PaginatedCompetitionProposalSchema = Paginated(CompetitionProposalSchema)
export type PaginatedCompetitionProposal = PaginatedResult<CompetitionProposal>

export const AdminCompetitionProposalSchema = CompetitionProposalSchema.extend({
  user: z.object({ username: z.string(), name: z.string() }),
})
export type AdminCompetitionProposal = z.infer<typeof AdminCompetitionProposalSchema>

export const PaginatedAdminCompetitionProposalSchema = Paginated(AdminCompetitionProposalSchema)
export type PaginatedAdminCompetitionProposal = PaginatedResult<AdminCompetitionProposal>

export const PaginatedCompetitionSummarySchema = Paginated(CompetitionSummarySchema)
export type PaginatedCompetitionSummary = PaginatedResult<CompetitionSummary>

export const CompetitionHotSchema = z.object({
  slug: z.string(),
  title: z.string(),
  metric: z.string(),
  participants: z.number(),
  prize_pool: z.string().nullable(),
  ends_at: z.string(),
})
export type CompetitionHot = z.infer<typeof CompetitionHotSchema>

export const CompetitionStatsSchema = z.object({
  total_competitions: z.number(),
  active: z.number(),
  upcoming: z.number(),
  past: z.number(),
  total_participants: z.number(),
  trending_tags: z.array(z.object({ tag: z.string(), count: z.number() })),
  years: z.array(z.number()),
  featured: z.array(CompetitionSummarySchema),
  hot_active: z.array(CompetitionHotSchema),
  my_active: z.number(),
})
export type CompetitionStats = z.infer<typeof CompetitionStatsSchema>

export const LeaderboardEntrySchema = z.object({
  rank: z.number(),
  participant: OwnerRefSchema,
  score: z.number(),
  submitted_at: z.string(),
})
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>

export const PaginatedLeaderboardSchema = Paginated(LeaderboardEntrySchema)
export type PaginatedLeaderboard = PaginatedResult<LeaderboardEntry>

export const SubmissionSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  status: z.enum(['queued', 'scored', 'failed']),
  public_score: z.number().nullable(),
  filename: z.string(),
})
export type Submission = z.infer<typeof SubmissionSchema>

export const SubmitResultSchema = SubmissionSchema.extend({
  remaining_today: z.number(),
})
export type SubmitResult = z.infer<typeof SubmitResultSchema>

export const PaginatedSubmissionSchema = Paginated(SubmissionSchema)
export type PaginatedSubmission = PaginatedResult<Submission>

export const EventSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  type: z.enum(['webinar', 'hackathon', 'bootcamp', 'meetup', 'demo_day']),
  mode: z.enum(['daring', 'luring']),
  status: z.enum(['upcoming', 'past']).optional(),
  starts_at: z.string(),
  ends_at: z.string(),
  location: z.string().nullable(),
  cover_url: z.string().nullable(),
  gallery_urls: z.array(z.string()).optional(),
  registered: z.number(),
  capacity: z.number().nullable(),
  featured: z.boolean().optional(),
  category: CategoryRefSchema.nullable().optional(),
  subcategory: CategoryRefSchema.nullable().optional(),
})
export type EventSummary = z.infer<typeof EventSummarySchema>

export const EventAgendaItemSchema = z.object({
  time: z.string(),
  title: z.string(),
})

export const EventSpeakerSchema = z.object({
  name: z.string(),
  title: z.string(),
  avatar_url: z.string().nullable(),
})

export const EventDetailSchema = EventSummarySchema.extend({
  spots_left: z.number().nullable(),
  my_registration: z.object({ status: z.enum(['registered', 'waitlisted']) }).nullable(),
  description_md: z.string(),
  agenda: z.array(EventAgendaItemSchema),
  speakers: z.array(EventSpeakerSchema),
})
export type EventDetail = z.infer<typeof EventDetailSchema>

export const EventProposalStatusSchema = z.enum([
  'draft',
  'pending_review',
  'revision_requested',
  'approved',
  'rejected',
])
export type EventProposalStatus = z.infer<typeof EventProposalStatusSchema>

export const EventProposalSchema = z.object({
  id: z.string(),
  proposed_slug: z.string(),
  title: z.string(),
  type: z.enum(['webinar', 'hackathon', 'bootcamp', 'meetup', 'demo_day']),
  mode: z.enum(['daring', 'luring']),
  starts_at: z.string(),
  ends_at: z.string(),
  location: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  gallery_urls: z.array(z.string()).default([]),
  capacity: z.number().nullable().optional(),
  description_md: z.string(),
  agenda: z.array(EventAgendaItemSchema).default([]),
  speakers: z.array(EventSpeakerSchema).default([]),
  category: CategoryRefSchema.nullable().optional(),
  subcategory: CategoryRefSchema.nullable().optional(),
  status: EventProposalStatusSchema,
  review_note: z.string().nullable().optional(),
  event_slug: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  submitted_at: z.string().nullable().optional(),
  user: z.object({ username: z.string(), name: z.string() }).optional(),
})
export type EventProposal = z.infer<typeof EventProposalSchema>

export const PaginatedEventProposalSchema = Paginated(EventProposalSchema)
export type PaginatedEventProposal = PaginatedResult<EventProposal>

export const AdminEventProposalSchema = EventProposalSchema.extend({
  user: z.object({ username: z.string(), name: z.string() }),
})
export type AdminEventProposal = z.infer<typeof AdminEventProposalSchema>

export const PaginatedAdminEventProposalSchema = Paginated(AdminEventProposalSchema)
export type PaginatedAdminEventProposal = PaginatedResult<AdminEventProposal>

export const EventRegistrationAdminSchema = z.object({
  id: z.string(),
  status: z.enum(['registered', 'waitlisted']),
  attended: z.boolean(),
  user: z.object({
    username: z.string(),
    name: z.string(),
    avatar_url: z.string().nullable(),
  }),
})
export type EventRegistrationAdmin = z.infer<typeof EventRegistrationAdminSchema>

export const PaginatedEventRegistrationAdminSchema = Paginated(EventRegistrationAdminSchema)
export type PaginatedEventRegistrationAdmin = PaginatedResult<EventRegistrationAdmin>

export const PaginatedEventSummarySchema = Paginated(EventSummarySchema)
export type PaginatedEventSummary = PaginatedResult<EventSummary>

export const EventNextSchema = z.object({
  slug: z.string(),
  title: z.string(),
  type: z.enum(['webinar', 'hackathon', 'bootcamp', 'meetup', 'demo_day']),
  starts_at: z.string(),
  registered: z.number(),
  capacity: z.number().nullable(),
})
export type EventNext = z.infer<typeof EventNextSchema>

export const EventStatsSchema = z.object({
  total_events: z.number(),
  upcoming: z.number(),
  past: z.number(),
  total_registered: z.number(),
  by_type: z.array(z.object({ type: z.string(), count: z.number() })),
  years: z.array(z.number()),
  featured: z.array(EventSummarySchema),
  next_events: z.array(EventNextSchema),
  my_upcoming: z.number(),
})
export type EventStats = z.infer<typeof EventStatsSchema>

export const RegistrationSchema = z.object({
  registration_id: z.string(),
  status: z.enum(['registered', 'waitlisted']),
})
export type Registration = z.infer<typeof RegistrationSchema>

export const CreateRepoBodySchema = z.object({
  name: z.string(),
  description: z.string(),
  visibility: z.enum(['public', 'private']),
  tags: z.array(z.string()),
  readme_md: z.string().optional(),
  license: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  team_id: z.string().nullable().optional(),
})

export const UpdateRepoBodySchema = z.object({
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  license: z.string().nullable().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  readme_md: z.string().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
})
export type UpdateRepoBody = z.infer<typeof UpdateRepoBodySchema>

export const FileEntrySchema = RepoFileSchema
export type FileEntry = RepoFile

export const CreateThreadBodySchema = z.object({
  title: z.string(),
  body_md: z.string(),
  tags: z.array(z.string()),
})

export const RegisterBodySchema = z.object({
  username: z.string(),
  email: z.string(),
  password: z.string(),
  name: z.string(),
  accept_tos: z.literal(true),
})

export const LoginBodySchema = z.object({
  email: z.string(),
  password: z.string(),
})

export const MySubmissionSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  status: z.enum(['queued', 'scored', 'failed']),
  public_score: z.number().nullable(),
  filename: z.string(),
  competition: z.object({ slug: z.string(), title: z.string() }),
})
export type MySubmission = z.infer<typeof MySubmissionSchema>
export const PaginatedMySubmissionSchema = Paginated(MySubmissionSchema)
export type PaginatedMySubmission = PaginatedResult<MySubmission>

export const MyEventRegistrationSchema = z.object({
  registration_id: z.string(),
  status: z.enum(['registered', 'waitlisted']),
  event: z.object({
    slug: z.string(),
    title: z.string(),
    type: z.string(),
    mode: z.enum(['daring', 'luring']),
    starts_at: z.string(),
    ends_at: z.string(),
    location: z.string().nullable(),
    cover_url: z.string().nullable(),
  }),
})
export type MyEventRegistration = z.infer<typeof MyEventRegistrationSchema>
export const PaginatedMyEventRegistrationSchema = Paginated(MyEventRegistrationSchema)
export type PaginatedMyEventRegistration = PaginatedResult<MyEventRegistration>

export const AnnouncementSchema = z.object({
  id: z.string(),
  title: z.string(),
  body_md: z.string(),
  level: z.enum(['info', 'penting']),
})
export type Announcement = z.infer<typeof AnnouncementSchema>

export const AdminAnnouncementSchema = AnnouncementSchema.extend({
  active: z.boolean(),
  created_at: z.string(),
})
export type AdminAnnouncement = z.infer<typeof AdminAnnouncementSchema>

export const BlogSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  cover_url: z.string().nullable(),
  tags: z.array(z.string()),
  author: OwnerRefSchema,
  published_at: z.string().nullable(),
  status: z.string().optional(),
})
export type BlogSummary = z.infer<typeof BlogSummarySchema>

export const BlogDetailSchema = BlogSummarySchema.extend({
  body_md: z.string(),
  status: z.string(),
})
export type BlogDetail = z.infer<typeof BlogDetailSchema>

export const PaginatedBlogSummarySchema = Paginated(BlogSummarySchema)
export type PaginatedBlogSummary = PaginatedResult<BlogSummary>

export const BlogSlugResponseSchema = z.object({ slug: z.string() })
export type BlogSlugResponse = z.infer<typeof BlogSlugResponseSchema>

export const BlogImageUploadSchema = z.object({ url: z.string() })
export type BlogImageUpload = z.infer<typeof BlogImageUploadSchema>

export const NotificationActorSchema = z.object({
  username: z.string(),
  avatar_url: z.string().nullable(),
  type: z.string(),
})
export type NotificationActor = z.infer<typeof NotificationActorSchema>

export const NotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  actor: NotificationActorSchema.nullable(),
  read: z.boolean(),
  created_at: z.string(),
})
export type Notification = z.infer<typeof NotificationSchema>

export const PaginatedNotificationSchema = Paginated(NotificationSchema)
export type PaginatedNotification = PaginatedResult<Notification>

export const UnreadCountSchema = z.object({ count: z.number() })
export type UnreadCount = z.infer<typeof UnreadCountSchema>

export const IdResponseSchema = z.object({ id: z.string() })
export type IdResponse = z.infer<typeof IdResponseSchema>

export const QuestStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  target: z.union([z.string(), z.number(), z.null()]).optional(),
  description: z.string().optional(),
  done: z.boolean().optional(),
})
export type QuestStep = z.infer<typeof QuestStepSchema>

export const QuestSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  steps_count: z.number().optional(),
  reward_reputation: z.number(),
})
export type QuestSummary = z.infer<typeof QuestSummarySchema>

export const QuestSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  steps: z.array(QuestStepSchema),
  progress: z.object({ done: z.number(), total: z.number() }),
  reward_reputation: z.number(),
  reward_badge: z.string().nullable(),
  complete: z.boolean(),
  claimed: z.boolean(),
  claimable: z.boolean(),
})
export type Quest = z.infer<typeof QuestSchema>

export const MyQuestsSchema = z.object({ items: z.array(QuestSchema) })
export type MyQuests = z.infer<typeof MyQuestsSchema>

export const JourneyNextSchema = z.object({
  next: z.object({
    title: z.string(),
    description: z.string(),
    cta_link: z.string(),
  }),
})
export type JourneyNext = z.infer<typeof JourneyNextSchema>

export const QuestClaimResultSchema = z.object({
  claimed: z.boolean(),
  reward_reputation: z.number(),
  reward_badge: z.string().nullable().optional(),
})
export type QuestClaimResult = z.infer<typeof QuestClaimResultSchema>

export const ActivityCategoryAffinitySchema = z.object({
  slug: z.string(),
  name: z.string(),
  count: z.number(),
})
export type ActivityCategoryAffinity = z.infer<typeof ActivityCategoryAffinitySchema>

export const ActivityTagAffinitySchema = z.object({
  tag: z.string(),
  count: z.number(),
})
export type ActivityTagAffinity = z.infer<typeof ActivityTagAffinitySchema>

export const ActivitySummarySchema = z.object({
  top_categories: z.array(ActivityCategoryAffinitySchema),
  top_tags: z.array(ActivityTagAffinitySchema),
  actions: z.record(z.number()),
  window_days: z.number(),
})
export type ActivitySummary = z.infer<typeof ActivitySummarySchema>

export const MicroQuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
})
export type MicroQuizQuestion = z.infer<typeof MicroQuizQuestionSchema>

export const MicroSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  duration_min: z.number(),
  has_quiz: z.boolean(),
})
export type MicroSummary = z.infer<typeof MicroSummarySchema>

export const DailyMicroSchema = z.object({ items: z.array(MicroSummarySchema) })
export type DailyMicro = z.infer<typeof DailyMicroSchema>

export const MicroLessonSchema = z.object({
  slug: z.string(),
  title: z.string(),
  content_md: z.string(),
  duration_min: z.number(),
  quiz: z.array(MicroQuizQuestionSchema),
  has_quiz: z.boolean(),
})
export type MicroLesson = z.infer<typeof MicroLessonSchema>

export const MicroQuizReviewSchema = z.object({
  id: z.string(),
  correct_index: z.number().nullable().optional(),
  explanation: z.string().nullable().optional(),
})

export const MicroCompleteResultSchema = z.object({
  completed: z.boolean(),
  first_completion: z.boolean().optional(),
  quiz: z
    .object({
      score: z.number(),
      correct: z.number(),
      total: z.number(),
      review: z.array(MicroQuizReviewSchema),
    })
    .nullable()
    .optional(),
})
export type MicroCompleteResult = z.infer<typeof MicroCompleteResultSchema>

export const StreakDaySchema = z.object({
  date: z.string(),
  active: z.boolean(),
})
export type StreakDay = z.infer<typeof StreakDaySchema>

export const StreakSchema = z.object({
  current_streak: z.number(),
  longest_streak: z.number(),
  active_today: z.boolean(),
  weekly_done: z.number(),
  weekly_goal: z.number(),
  calendar: z.array(StreakDaySchema),
})
export type Streak = z.infer<typeof StreakSchema>

export const MicroAdminSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  duration_min: z.number(),
  active: z.boolean(),
  has_quiz: z.boolean(),
})
export type MicroAdminSummary = z.infer<typeof MicroAdminSummarySchema>

export const MicroAdminDetailSchema = MicroLessonSchema.extend({
  active: z.boolean(),
  category_id: z.string().nullable().optional(),
  quiz: z.array(
    MicroQuizQuestionSchema.extend({
      answer_index: z.number().optional(),
      explanation: z.string().optional(),
    }),
  ),
})
export type MicroAdminDetail = z.infer<typeof MicroAdminDetailSchema>

export const CollectionRepoItemSchema = z.object({
  type: z.enum(['model', 'dataset', 'project']),
  slug: z.string(),
  name: z.string(),
  owner: z.string(),
  likes: z.number(),
  downloads: z.number(),
})

export const CollectionNotebookItemSchema = z.object({
  type: z.literal('notebook'),
  id: z.string(),
  title: z.string(),
})

export const CollectionItemSchema = z.union([CollectionRepoItemSchema, CollectionNotebookItemSchema])
export type CollectionItem = z.infer<typeof CollectionItemSchema>

export const CollectionSchema = z.object({
  slug: z.string(),
  title: z.string(),
  cover_url: z.string().nullable(),
  is_featured: z.boolean(),
  count: z.number(),
  description_md: z.string().optional(),
  items: z.array(CollectionItemSchema).optional(),
})
export type Collection = z.infer<typeof CollectionSchema>

export const PaginatedCollectionSchema = Paginated(CollectionSchema)
export type PaginatedCollection = PaginatedResult<Collection>

export const TransformerHubSchema = z.object({
  category: z
    .object({
      slug: z.string(),
      name: z.string(),
      description: z.string(),
    })
    .nullable(),
  collections: z.array(CollectionSchema),
  models: z.array(RepoSummarySchema),
  datasets: z.array(RepoSummarySchema),
  notebooks: z.array(z.object({ id: z.string(), title: z.string() })),
})
export type TransformerHub = z.infer<typeof TransformerHubSchema>

export const PipelineStatusSchema = z.enum(['draft', 'valid', 'error'])
export type PipelineStatus = z.infer<typeof PipelineStatusSchema>

export const DataSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  uri: z.string(),
  kind: z.string(),
})
export type DataSource = z.infer<typeof DataSourceSchema>

export const SourceSchemaColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
})
export const SourceSchemaSchema = z.object({
  columns: z.array(SourceSchemaColumnSchema),
})
export type SourceSchema = z.infer<typeof SourceSchemaSchema>

export const DataSourceListSchema = z.object({
  items: z.array(DataSourceSchema),
})

export const PipelineNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['source', 'transform', 'sink']),
  op: z.enum(['select', 'filter', 'join', 'aggregate', 'cast', 'derive', 'dedupe']).optional(),
  layer: z.enum(['bronze', 'silver', 'gold']).nullable().optional(),
  params: z.record(z.any()).default({}),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
})
export type PipelineNode = z.infer<typeof PipelineNodeSchema>

export const PipelineSpecSchema = z.object({
  nodes: z.array(PipelineNodeSchema),
  edges: z.array(z.object({ source: z.string(), target: z.string() })),
})
export type PipelineSpec = z.infer<typeof PipelineSpecSchema>

export const PipelineSummarySchema = z.object({
  id: z.string().optional(),
  slug: z.string(),
  title: z.string(),
  status: PipelineStatusSchema,
})
export type PipelineSummary = z.infer<typeof PipelineSummarySchema>

export const PaginatedPipelineSummarySchema = Paginated(PipelineSummarySchema)
export type PaginatedPipelineSummary = PaginatedResult<PipelineSummary>

export const PipelineSchema = PipelineSummarySchema.extend({
  spec: PipelineSpecSchema.optional(),
  validation_error: z.string().nullable().optional(),
  team_id: z.string().nullable().optional(),
  room_id: z.string().nullable().optional(),
  engine: z.enum(['auto', 'duckdb', 'spark']).optional(),
  schedule_cron: z.string().nullable().optional(),
})
export type Pipeline = z.infer<typeof PipelineSchema>

export const PipelineValidateResultSchema = z.object({
  status: PipelineStatusSchema,
  errors: z.array(z.string()),
})

export const PipelineUpdateResultSchema = z.object({
  slug: z.string(),
  status: PipelineStatusSchema,
  errors: z.array(z.string()).optional(),
})

export const FactoryQuotaSchema = z.object({
  runs_per_day: z.number(),
  max_rows: z.number(),
  max_nodes: z.number(),
  runs_used_today: z.number(),
})
export type FactoryQuota = z.infer<typeof FactoryQuotaSchema>

export const RunStatusSchema = z.enum(['queued', 'running', 'done', 'error'])
export type RunStatus = z.infer<typeof RunStatusSchema>

export const RunSummarySchema = z.object({
  id: z.string(),
  status: RunStatusSchema,
  rows_out: z.number(),
  duration_ms: z.number(),
  created_at: z.string(),
  execution_engine: z.string().nullable().optional(),
})
export type RunSummary = z.infer<typeof RunSummarySchema>

export const RunLayerItemSchema = z.object({
  node: z.string(),
  rows: z.number(),
  uri: z.string(),
})

export const RunDetailSchema = z.object({
  id: z.string(),
  status: RunStatusSchema,
  rows_out: z.number(),
  layers: z.record(z.array(RunLayerItemSchema)),
  lineage: z.record(z.any()),
  error: z.string().nullable(),
  duration_ms: z.number(),
  execution_engine: z.string().nullable().optional(),
})
export type RunDetail = z.infer<typeof RunDetailSchema>

export const RunListSchema = z.object({
  items: z.array(RunSummarySchema),
})

export const RunStartSchema = z.object({
  run_id: z.string(),
  status: z.string(),
  engine: z.string().optional(),
  queue: z.string().optional(),
})

export const LayerDownloadSchema = z.object({
  url: z.string(),
})

export const WidgetKindSchema = z.enum(['kpi', 'table', 'line', 'bar', 'pie', 'scatter'])
export type WidgetKind = z.infer<typeof WidgetKindSchema>

export const DashboardWidgetSchema = z.object({
  id: z.string(),
  kind: WidgetKindSchema,
  title: z.string(),
  query: z.record(z.unknown()),
  options: z.record(z.unknown()).optional(),
})
export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>

export const DashboardSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  visibility: z.enum(['private', 'public']),
  pipeline_id: z.string().nullable().optional(),
})
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>

export const PaginatedDashboardSummarySchema = Paginated(DashboardSummarySchema)
export type PaginatedDashboardSummary = PaginatedResult<DashboardSummary>

export const DashboardSchema = DashboardSummarySchema.extend({
  description_md: z.string(),
  layout: z.array(z.record(z.unknown())),
  owner_id: z.string().optional(),
  superset_dataset_id: z.number().nullable().optional(),
  superset_dashboard_id: z.number().nullable().optional(),
  superset_embed_uuid: z.string().nullable().optional(),
  superset_gold_table: z.string().nullable().optional(),
  widgets: z.array(DashboardWidgetSchema),
})
export type Dashboard = z.infer<typeof DashboardSchema>

export const WidgetDataSchema = z.record(z.unknown())
export type WidgetData = z.infer<typeof WidgetDataSchema>
