import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import busLogo from '../assets/BusLogo.png';

const Footer = () => {
  const footerSections = [
    {
      title: "Company",
      links: ["About Us", "Careers", "Contact Us"]
    },
    {
      title: "Support",
      links: ["Help Center", "Terms & Conditions", "Privacy Policy", "Cancellation Policy", "Refund Policy"]
    },
  ];

  return (
    <footer className="bg-black text-white">
      {/* Main Footer Content */}
      <div className="w-full px-4 pt-6 pb-4">
        <div className="space-y-6">
          {/* Brand Section */}
          <div>
            <img src={busLogo} alt="Bus Logo" className="h-9 w-auto mb-3 filter brightness-0 invert" />
            <p className="text-white/80 text-xs leading-relaxed mb-3">
              India's leading Bus, Car, and Auto-Ricksaw booking platform connecting millions of travelers with trusted operators.
            </p>

            {/* Download App Button */}
            <div className="mb-3">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                onClick={() => window.open('https://play.google.com/store/apps/details?id=com.chalo.sawari', '_blank')}
              >
                <Smartphone className="w-4 h-4 mr-1.5" />
                Download App
              </Button>
            </div>

            <div className="flex space-x-3">
              <Button variant="ghost" size="icon" className="text-white/80 h-8 w-8 hover:bg-white/10">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white/80 h-8 w-8 hover:bg-white/10">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white/80 h-8 w-8 hover:bg-white/10">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white/80 h-8 w-8 hover:bg-white/10">
                <Linkedin className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Footer Links (Company & Support side by side) */}
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            {footerSections.map((section, index) => (
              <div key={index}>
                <h4 className="font-semibold text-sm mb-2 text-white">{section.title}</h4>
                <ul className="space-y-1.5">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      {link === "Help Center" ? (
                        <Link to="/help">
                          <button className="text-white/70 hover:text-white text-xs p-0 text-left transition-colors">
                            {link}
                          </button>
                        </Link>
                      ) : link === "Terms & Conditions" ? (
                        <Link to="/terms-conditions">
                          <button className="text-white/70 hover:text-white text-xs p-0 text-left transition-colors">
                            {link}
                          </button>
                        </Link>
                      ) : link === "Privacy Policy" ? (
                        <Link to="/privacy-policy">
                          <button className="text-white/70 hover:text-white text-xs p-0 text-left transition-colors">
                            {link}
                          </button>
                        </Link>
                      ) : link === "Cancellation Policy" ? (
                        <Link to="/cancellation-policy">
                          <button className="text-white/70 hover:text-white text-xs p-0 text-left transition-colors">
                            {link}
                          </button>
                        </Link>
                      ) : link === "Refund Policy" ? (
                        <Link to="/refund-policy">
                          <button className="text-white/70 hover:text-white text-xs p-0 text-left transition-colors">
                            {link}
                          </button>
                        </Link>
                      ) : (
                        <button className="text-white/70 hover:text-white text-xs p-0 text-left transition-colors">
                          {link}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="border-t border-white/10">
        <div className="w-full px-4 py-3 space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-white/80">
            <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Customer Care: +91 9171838260</span>
          </div>
          <div className="flex items-center space-x-2 text-white/80">
            <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <a href="mailto:chalosawariofficial@gmail.com" className="hover:text-white truncate">chalosawariofficial@gmail.com</a>
          </div>
          <div className="flex items-center space-x-2 text-white/80">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Indore, India</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="w-full px-4 py-2.5">
          <p className="text-white/50 text-[11px] text-center">&copy; {new Date().getFullYear()} Chalo Sawari. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;