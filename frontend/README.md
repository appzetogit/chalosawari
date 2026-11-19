# Chalo Sawari - Bus, Car & Auto-Ricksaw Booking Platform

A modern, responsive web application for booking Bus, Car, and Auto-Ricksaw services. Built with React, TypeScript, and Tailwind CSS.

## 🚀 Features

### Multi-Modal Transportation Booking
- **Bus Booking**: Intercity and intracity bus services
- **Car Booking**: Rental cars and chauffeur-driven services  
- **Auto-Ricksaw Booking**: Group travel and tour packages

### Key Features
- 🎯 **Real-time Vehicle Tracking**: Track your Bus, Car, or Auto-Ricksaw in real-time
- 💳 **Secure Payment Gateway**: Multiple payment options including UPI, cards, and digital wallets
- 📱 **Mobile App**: Download our app for on-the-go bookings
- 🛡️ **Safe & Secure**: Verified operators and secure transactions
- 🕒 **24/7 Support**: Round-the-clock customer support
- 💰 **Best Prices**: Compare prices across operators for the best deals

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Build Tool**: Vite
- **Package Manager**: npm/bun
- **Icons**: Lucide React
- **Routing**: React Router DOM

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ProjectBusCar
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your actual API keys and configuration
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🔧 Environment Variables

This project uses environment variables for configuration. Copy `env.example` to `.env` and fill in your values:

### Required Environment Variables
- `VITE_API_KEY`: Your API key for the application
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key for payments
- `VITE_STRIPE_SECRET_KEY`: Stripe secret key for payments
- Razorpay keys are NOT needed here: the backend sends the key ID (from `RAZORPAY_KEY_ID` in `backend/.env`) with each order

### Security Note
⚠️ **Never commit your `.env` file to version control**. The `.env` file is already added to `.gitignore` to prevent accidental commits.

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── TopNavigation.tsx
│   ├── HeroSection.tsx
│   ├── OffersSection.tsx
│   ├── WhyChooseUs.tsx
│   ├── PopularRoutes.tsx
│   ├── BookingBenefits.tsx
│   ├── HowToBook.tsx
│   ├── PartnersSection.tsx
│   ├── RoutesTable.tsx
│   ├── LiveTrackingSection.tsx
│   ├── AppDownloadSection.tsx
│   └── Footer.tsx
├── pages/              # Page components
│   ├── Index.tsx       # Main landing page
│   ├── Auth.tsx        # Authentication page
│   └── NotFound.tsx    # 404 page
├── assets/             # Static assets
│   ├── BusLogo.png
│   ├── HomeBanner.webp
│   ├── hero-background.jpg
│   └── mobile-app.png
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
└── index.css           # Global styles and CSS variables
```

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#2563eb) - Main brand color
- **Secondary**: Light gray (#f8fafc) - Background sections
- **Accent**: Blue variations for highlights
- **Destructive**: Red (#ef4444) - Error states

### Typography
- **Headings**: Bold, large text for section titles
- **Body**: Regular weight for content
- **Captions**: Smaller text for secondary information

## 📱 Components Overview

### Core Components
- **TopNavigation**: Main navigation with booking options
- **HeroSection**: Landing banner with search functionality
- **WhyChooseUs**: Feature highlights and benefits
- **LiveTrackingSection**: Real-time vehicle tracking
- **AppDownloadSection**: Mobile app promotion
- **Footer**: Links, contact info, and company details

### Booking Flow
1. **Search**: Enter source, destination, and travel date
2. **Select**: Choose preferred vehicle and options
3. **Pay**: Secure payment processing
4. **Confirm**: Instant booking confirmation

## 🚀 Deployment

### Build for Production
```bash
npm run build
# or
bun run build
```

### Preview Production Build
```bash
npm run preview
# or
bun run preview
```

## 📞 Contact & Support

- **Customer Care**: +91 9171838260
- **Email**: support@chalosawari.com
- **Location**: Indore, India
- **Website**: [chalosawari.com](https://chalosawari.com)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **shadcn/ui** for beautiful UI components
- **Tailwind CSS** for utility-first styling
- **Lucide React** for beautiful icons
- **Vite** for fast development experience

---

**© 2025 Chalo Sawari. All rights reserved.**
