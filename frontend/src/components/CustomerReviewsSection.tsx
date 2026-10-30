import React, { useState, useEffect } from "react";
import { Star, User } from "lucide-react";
import { reviewApi, type CustomerReview } from "@/services/reviewApi";
import { resolveImageUrl } from "@/utils/imageUrl";

// Fallback reviews in case database has no rated bookings yet
const fallbackReviews: CustomerReview[] = [
  {
    id: "1",
    rating: 5,
    comment: "Very good service and professional drivers. My journey was very comfy.",
    name: "Rahul Sharma",
    city: "Indore",
  },
  {
    id: "2",
    rating: 5,
    comment: "Best travel experience at very affordable prices.",
    name: "Priya Patel",
    city: "Ujjain",
  },
  {
    id: "3",
    rating: 5,
    comment: "On-time pickup and drop. Highly recommended!",
    name: "Amit Verma",
    city: "Bhopal",
  },
];

const CustomerReviewsSection: React.FC = () => {
  const [reviews, setReviews] = useState<CustomerReview[]>(fallbackReviews);
  const [activeIndex, setActiveIndex] = useState(0);
  const [avatarErrorMap, setAvatarErrorMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    reviewApi
      .getPublicReviews()
      .then((res) => {
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setReviews(res.data);
          setActiveIndex(0);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch customer reviews:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const itemWidth = e.currentTarget.offsetWidth * 0.8;
    if (itemWidth > 0) {
      const newIndex = Math.round(scrollLeft / itemWidth);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < reviews.length) {
        setActiveIndex(newIndex);
      }
    }
  };

  const handleAvatarError = (id: string) => {
    setAvatarErrorMap((prev) => ({ ...prev, [id]: true }));
  };

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="px-3 pt-2.5 pb-2 bg-transparent">
      {/* Outer Card Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
        {/* Header */}
        <div className="mb-3.5">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            What Our Customers Say
          </h3>
        </div>

        {/* Review Carousel: 1 full card visible + next card peeking */}
        <div
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
        >
          {reviews.map((item) => {
            const hasAvatar = Boolean(item.profilePicture) && !avatarErrorMap[item.id];
            const starCount = Math.max(1, Math.min(5, Math.round(item.rating || 5)));

            return (
              <div
                key={item.id}
                className="w-[82%] sm:w-[84%] min-w-[260px] max-w-[310px] bg-white rounded-2xl p-4 border border-slate-100/90 shadow-2xs flex flex-col justify-between shrink-0 snap-start hover:border-slate-200 transition-all"
              >
                {/* Stars & Comment */}
                <div>
                  <div className="flex items-center gap-1 mb-2.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < starCount
                            ? "fill-amber-400 text-amber-400"
                            : "fill-slate-100 text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed">
                    "{item.comment}"
                  </p>
                </div>

                {/* Author details */}
                <div className="flex items-center gap-2.5 pt-3.5 mt-3 border-t border-slate-100/80">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                    {hasAvatar ? (
                      <img
                        src={resolveImageUrl(item.profilePicture)}
                        alt={item.name}
                        onError={() => handleAvatarError(item.id)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight truncate">
                      - {item.name}
                    </h5>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5 truncate">
                      {item.city}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Pagination Indicator */}
        {reviews.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {reviews.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? "w-5 bg-blue-600"
                    : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CustomerReviewsSection;
