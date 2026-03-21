// HelpSupport.js - Help and support page for all users
import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  MessageCircle,
  Book,
  Video,
  Clock,
  Users,
  Calendar,
  Shield,
  Bell,
  CheckCircle
} from 'lucide-react';

const HelpSupport = ({ user }) => {
  const [activeTab, setActiveTab] = useState('faq');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    priority: 'medium'
  });

  const faqData = [
    {
      category: 'Getting Started',
      questions: [
        {
          id: 1,
          question: 'How do I book a duty schedule?',
          answer: 'To book a duty schedule: 1) Go to the Schedule Calendar page, 2) Find an available date (shown in white with less than 2 students), 3) Click the "Book Duty" button on that date, 4) Wait for admin approval. Remember, you cannot book for the same day - bookings must be made in advance.'
        },
        {
          id: 2,
          question: 'How do I create an account?',
          answer: 'Click "Register" on the login page, fill in your details including your full name, email (use your ISCC email), choose your role (Student, Admin, or Parent), and create a password. Students need to provide their student number and year level.'
        },
        {
          id: 3,
          question: 'What are the different user roles?',
          answer: 'There are three roles: 1) Students - Can book duties and view their schedules, 2) Admin/Coordinators - Can approve schedules, manage students, and view system logs, 3) Parents - Can view their child\'s duty history for transparency.'
        }
      ]
    },
    {
      category: 'Booking & Scheduling',
      questions: [
        {
          id: 4,
          question: 'Why can\'t I book a duty for today?',
          answer: 'The system requires advance booking to ensure proper planning. You cannot book duties for the same day, even before 8 AM. This rule helps maintain the quality of patient care and ensures adequate preparation time.'
        },
        {
          id: 5,
          question: 'How many students can be assigned per day?',
          answer: 'Maximum 2 students can be assigned per duty day. This limit ensures adequate supervision and learning opportunities while maintaining quality patient care standards.'
        },
        {
          id: 6,
          question: 'Can I cancel my duty booking?',
          answer: 'Yes, but not on the same day as your duty. Cancellations must be made in advance to allow time for finding replacements. Use the "Cancel" button in your "My Duties" section for bookings that are not on the current date.'
        },
        {
          id: 7,
          question: 'What happens after I book a duty?',
          answer: 'After booking, your duty will show as "Pending" status. The admin/coordinator will review and approve it. You\'ll receive a notification once it\'s approved. Only approved duties are confirmed.'
        }
      ]
    },
    {
      category: 'Notifications & Communication',
      questions: [
        {
          id: 8,
          question: 'How do I manage notifications?',
          answer: 'Go to Profile Settings > Notifications tab to customize your notification preferences. You can enable/disable email notifications, SMS alerts, duty reminders, and system announcements.'
        },
        {
          id: 9,
          question: 'Why am I not receiving notifications?',
          answer: 'Check your notification settings in Profile Settings. Ensure your email is correct and verified. For email notifications, check your spam folder. Contact admin if the issue persists.'
        }
      ]
    },
    {
      category: 'Account & Security',
      questions: [
        {
          id: 10,
          question: 'How do I change my password?',
          answer: 'Go to Profile Settings > Security tab. Enter your current password, then your new password (minimum 6 characters), and confirm it. Click "Update Password" to save changes.'
        },
        {
          id: 11,
          question: 'Can I change my email address?',
          answer: 'Email addresses cannot be changed through the system for security reasons. Contact your administrator if you need to update your email address.'
        }
      ]
    },
    {
      category: 'For Parents',
      questions: [
        {
          id: 12,
          question: 'How can I view my child\'s duty history?',
          answer: 'Parents have view-only access to their child\'s duty history. After creating a parent account with your child\'s student ID, you can see their scheduled duties, completion status, and attendance records for transparency and accountability.'
        }
      ]
    },
    {
      category: 'For Administrators',
      questions: [
        {
          id: 13,
          question: 'How do I approve student duty bookings?',
          answer: 'Go to the Schedule Calendar or Manage Schedules page. Pending bookings will show with an "Approve" button. Review the booking details and click "Approve" to confirm the duty assignment.'
        },
        {
          id: 14,
          question: 'How do I create multiple schedules at once?',
          answer: 'Use the "Bulk Create" feature in Schedule Management. Select your date range, choose days of the week (e.g., Monday-Friday), and the system will create schedules for all selected days automatically.'
        }
      ]
    }
  ];

  const quickLinks = [
    { title: 'Book a Duty', description: 'Schedule your next duty assignment', icon: Calendar, action: 'schedule' },
    { title: 'View My Duties', description: 'Check your upcoming and past duties', icon: Clock, action: 'duties' },
    { title: 'Update Profile', description: 'Manage your account settings', icon: Users, action: 'profile' },
    { title: 'Notification Settings', description: 'Customize your alerts', icon: Bell, action: 'notifications' }
  ];

  const contactOptions = [
    {
      title: 'Email Support',
      description: 'Get help via email within 24 hours',
      icon: Mail,
      contact: 'support@iscc.edu',
      action: 'email'
    },
    {
      title: 'Phone Support',
      description: 'Call us during office hours (8AM-5PM)',
      icon: Phone,
      contact: '(077) 123-4567',
      action: 'phone'
    },
    {
      title: 'Live Chat',
      description: 'Chat with our support team',
      icon: MessageCircle,
      contact: 'Available Mon-Fri 8AM-5PM',
      action: 'chat'
    }
  ];

  const filteredFaq = faqData.map(category => ({
    ...category,
    questions: category.questions.filter(q =>
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would send the message to support
    alert('Thank you for contacting us! We\'ll get back to you within 24 hours.');
    setContactForm({ subject: '', message: '', priority: 'medium' });
  };

  const FAQSection = () => (
    <div className="space-y-6">
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search frequently asked questions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {filteredFaq.map((category) => (
        <div key={category.category} className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{category.category}</h3>
          <div className="space-y-3">
            {category.questions.map((faq) => (
              <div key={faq.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  {expandedFaq === faq.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {expandedFaq === faq.id && (
                  <div className="px-4 pb-4">
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {filteredFaq.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">Try different keywords or contact support for help.</p>
        </div>
      )}
    </div>
  );

  const ContactSection = () => (
    <div className="space-y-6">
      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contactOptions.map((option) => {
          const Icon = option.icon;
          return (
            <div key={option.title} className="card text-center">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{option.title}</h3>
              <p className="text-gray-600 text-sm mb-3">{option.description}</p>
              <p className="font-medium text-emerald-600">{option.contact}</p>
            </div>
          );
        })}
      </div>

      {/* Contact Form */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Send us a Message</h3>
        <form onSubmit={handleContactSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={contactForm.subject}
              onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
              className="input-field"
              required
            >
              <option value="">Select a subject</option>
              <option value="booking_issue">Booking Issue</option>
              <option value="account_problem">Account Problem</option>
              <option value="technical_support">Technical Support</option>
              <option value="feature_request">Feature Request</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={contactForm.priority}
              onChange={(e) => setContactForm({ ...contactForm, priority: e.target.value })}
              className="input-field"
            >
              <option value="low">Low - General inquiry</option>
              <option value="medium">Medium - Normal support</option>
              <option value="high">High - Urgent issue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              className="input-field h-32 resize-none"
              placeholder="Describe your issue or question in detail..."
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            Send Message
          </button>
        </form>
      </div>
    </div>
  );

  const GuidesSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            title: 'Student Quick Start Guide',
            description: 'Learn how to register, book duties, and manage your schedule',
            icon: Book,
            time: '5 min read'
          },
          {
            title: 'Admin User Manual',
            description: 'Complete guide for administrators and coordinators',
            icon: Shield,
            time: '15 min read'
          },
          {
            title: 'Parent Access Guide',
            description: 'How parents can view their child\'s duty history',
            icon: Users,
            time: '3 min read'
          },
          {
            title: 'Video Tutorials',
            description: 'Step-by-step video guides for common tasks',
            icon: Video,
            time: 'Various lengths'
          }
        ].map((guide) => {
          const Icon = guide.icon;
          return (
            <div key={guide.title} className="card hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start space-x-4">
                <div className="bg-emerald-100 p-3 rounded-lg">
                  <Icon className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{guide.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{guide.description}</p>
                  <span className="text-xs text-gray-500">{guide.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const tabs = [
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'guides', label: 'Guides', icon: Book },
    { id: 'contact', label: 'Contact', icon: MessageCircle }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Help & Support</h2>
        <p className="text-gray-600">
          Get help with the Comadronas On-Call Duty System
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.title}
              className="card hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{link.title}</h3>
                  <p className="text-sm text-gray-600">{link.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="card">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'faq' && <FAQSection />}
        {activeTab === 'guides' && <GuidesSection />}
        {activeTab === 'contact' && <ContactSection />}
      </div>

      {/* System Information */}
      <div className="card bg-gray-50 border-l-4 border-l-emerald-500">
        <div className="flex items-start space-x-3">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">System Status</h4>
            <p className="text-sm text-gray-600 mt-1">
              All systems operational. For emergency technical issues during duty hours,
              contact the IT helpdesk at (077) 123-4567 ext. 100.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;