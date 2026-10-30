import TopNavigation from '../components/TopNavigation';
import HeroSection from '../components/HeroSection';
import OffersSection from '../components/OffersSection';
import WhyChooseUs from '../components/WhyChooseUs';
import CustomerReviewsSection from '../components/CustomerReviewsSection';
import UserBottomNavigation from '../components/UserBottomNavigation';

const Index = () => {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <TopNavigation />
      <HeroSection />
      <OffersSection />
      <WhyChooseUs />
      <CustomerReviewsSection />
      <div className="pb-24"></div>
      <UserBottomNavigation />
    </div>
  );
};

export default Index;