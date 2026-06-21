import React from 'react';
import { Link } from 'react-router-dom';
import RevealSection from '@/components/RevealSection';

const Footer = () => (
  <RevealSection delay={50}><footer className="border-t border-border mt-16 py-12 px-4 sm:px-12 text-gray-500 text-sm">
    <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
      <div>
        <p className="text-white font-bold mb-3">NourishMind</p>
        <p className="text-xs leading-relaxed">Evidence-based courses on nutritional psychiatry and mental wellness.</p>
      </div>
      <div>
        <p className="font-semibold text-gray-300 mb-3">Learn</p>
        <div className="flex flex-col gap-2 text-xs">
          <Link to="/courses" className="hover:text-white transition-colors">All Courses</Link>
          <Link to="/courses?cat=for-professionals" className="hover:text-white transition-colors">For Professionals</Link>
          <Link to="/courses?cat=arabic" className="hover:text-white transition-colors">Arabic Content</Link>
        </div>
      </div>
      <div>
        <p className="font-semibold text-gray-300 mb-3">Account</p>
        <div className="flex flex-col gap-2 text-xs">
          <Link to="/login" className="hover:text-white transition-colors">Login</Link>
          <Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link>
        </div>
      </div>
      <div>
        <p className="font-semibold text-gray-300 mb-3">Support</p>
        <div className="flex flex-col gap-2 text-xs">
          <a href="mailto:hello@nourishmind.com" className="hover:text-white transition-colors">Contact Us</a>
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
        </div>
      </div>
    </div>
    <p className="text-xs text-center opacity-50">© 2026 NourishMind. All rights reserved.</p>
  </footer>
</RevealSection>
);

export default Footer;
