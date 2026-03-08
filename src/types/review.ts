export type ReviewSort = "recent" | "highest" | "lowest";

export type ReviewAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type ExperienceReview = {
  id: string;
  bookingId: string;
  experienceId: string;
  authorId: string;
  ratingOverall: number;
  ratingAccuracy: number | null;
  ratingCleanliness: number | null;
  ratingCommunication: number | null;
  ratingLocation: number | null;
  ratingValue: number | null;
  title: string | null;
  text: string;
  hostResponse: string | null;
  hostRespondedAt: string | null;
  createdAt: string;
  author: ReviewAuthor;
};

export type ReviewRatingBreakdownItem = {
  stars: number;
  count: number;
  percentage: number;
};

export type ReviewCategoryAverages = {
  accuracy: number | null;
  cleanliness: number | null;
  communication: number | null;
  location: number | null;
  value: number | null;
};

export type ExperienceReviewSummary = {
  totalReviews: number;
  averageRating: number;
  breakdown: ReviewRatingBreakdownItem[];
  categories: ReviewCategoryAverages;
};

export type CreateReviewInput = {
  bookingId: string;
  experienceId: string;
  ratingOverall: number;
  text: string;
};
