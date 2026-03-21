import React, { useState, useEffect } from 'react';
import { Shield, Clock, Calendar, Wifi, Database } from 'lucide-react';

const STEPS = [
  { icon: Wifi, text: "Connecting to server", delay: 0 },
  { icon: Shield, text: "Verifying authentication", delay: 1000 },
  { icon: Database, text: "Loading your profile", delay: 2000 },
  { icon: Calendar, text: "Preparing dashboard", delay: 3000 }
];

const LoadingSpinner = ({ message = "Loading your dashboard..." }) => {
  const [dots, setDots] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    // Animate steps
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % STEPS.length);
    }, 1500);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(stepInterval);
    };
  }, []);

  const CurrentIcon = STEPS[currentStep].icon;
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-slate-50 flex items-center justify-center">
      <div className="text-center">
        {/* Main Logo with Dynamic Animation */}
        <div className="relative mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-600 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
            <CurrentIcon className="w-10 h-10 text-white animate-pulse" />
          </div>
          
          {/* Orbiting Icons */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center opacity-70">
                <Clock className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center opacity-70">
                <Calendar className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <h1 className="text-3xl font-bold gradient-text mb-2">
          Kumadronas System
        </h1>
        <p className="text-gray-600 mb-6">
          Ilocos Sur Community College
        </p>

        {/* Animated Loading Bar */}
        <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-600 to-green-600 rounded-full animate-pulse"></div>
        </div>

        <p className="text-gray-500 animate-pulse mb-4">
          {message}{dots}
        </p>

        {/* Current Step Indicator */}
        <div className="bg-white bg-opacity-80 backdrop-blur-sm rounded-lg p-4 mb-6 border border-gray-200">
          <div className="flex items-center justify-center space-x-3">
            <CurrentIcon className="w-5 h-5 text-emerald-600 animate-pulse" />
            <span className="text-sm font-medium text-gray-700">
              {STEPS[currentStep].text}
            </span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center space-x-2 mb-6">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div
                key={index}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  index <= currentStep 
                    ? 'bg-emerald-600 text-white scale-110' 
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <StepIcon className="w-4 h-4" />
              </div>
            );
          })}
        </div>

        {/* Floating Dots Animation */}
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>

        {/* Timeout Warning */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Taking longer than usual? Try refreshing the page
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;