import HeroSection from '../components/HeroSection';
import OffersSection from '../components/OffersSection';
import WhyChooseUs from '../components/WhyChooseUs';
import CustomerReviewsSection from '../components/CustomerReviewsSection';
import UserBottomNavigation from '../components/UserBottomNavigation';

const Index = () => {
  return (
    <div className="min-h-screen bg-slate-50 pb-28 space-y-6">
      <HeroSection />
      <OffersSection />
      <WhyChooseUs />
      <CustomerReviewsSection />
      <UserBottomNavigation />
    </div>
  );
};

export default Index;
