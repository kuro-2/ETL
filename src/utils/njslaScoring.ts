import { NJSLAGradeConfig, NJSLAScoreRange, NJSLASubject } from '../types/assessment';

// Comprehensive Assessment Configuration System
export interface AssessmentConfig {
  assessmentType: string;
  displayName: string;
  subject: 'ELA' | 'Mathematics' | 'Science';
  grade: string;
  format: 'NJSLA' | 'NJSLS_Form_A' | 'NJSLS_Form_B' | 'Start_Strong' | 'Custom';
  scoringMethod: 'scale_score' | 'percent_score' | 'raw_score' | 'mixed';
  scoreRange: {
    minScore: number;
    maxScore: number;
    scoreType: string;
  };
  performanceLevels: Array<{
    level: number;
    minScore: number;
    maxScore: number;
    description: string;
    linkItText?: string[];
  }>;
  subscores?: {
    reading?: boolean;
    writing?: boolean;
    vocabulary?: boolean;
    standards?: boolean;
  };
  metadata?: {
    vendor?: string;
    year?: string;
    description?: string;
  };
}

// Assessment Configuration Registry
export const ASSESSMENT_CONFIGS: Record<string, AssessmentConfig> = {
  // NJSLA Configurations
  'NJSLA_ELA_3': {
    assessmentType: 'NJSLA_ELA',
    displayName: 'NJSLA ELA Grade 3',
    subject: 'ELA',
    grade: '3',
    format: 'NJSLA',
    scoringMethod: 'scale_score',
    scoreRange: { minScore: 650, maxScore: 850, scoreType: 'scale_score' },
    performanceLevels: [
      { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
      { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
      { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
      { level: 4, minScore: 750, maxScore: 809, description: 'Meeting' },
      { level: 5, minScore: 810, maxScore: 850, description: 'Exceeding' }
    ],
    subscores: { reading: true, writing: true, vocabulary: true },
    metadata: { vendor: 'NJSLA', description: 'New Jersey Student Learning Assessment ELA' }
  },
  'NJSLA_ELA_4': {
    assessmentType: 'NJSLA_ELA',
    displayName: 'NJSLA ELA Grade 4',
    subject: 'ELA',
    grade: '4',
    format: 'NJSLA',
    scoringMethod: 'scale_score',
    scoreRange: { minScore: 650, maxScore: 850, scoreType: 'scale_score' },
    performanceLevels: [
      { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
      { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
      { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
      { level: 4, minScore: 750, maxScore: 789, description: 'Meeting' },
      { level: 5, minScore: 790, maxScore: 850, description: 'Exceeding' }
    ],
    subscores: { reading: true, writing: true, vocabulary: true },
    metadata: { vendor: 'NJSLA', description: 'New Jersey Student Learning Assessment ELA' }
  },
  'NJSLA_ELA_5': {
    assessmentType: 'NJSLA_ELA',
    displayName: 'NJSLA ELA Grade 5',
    subject: 'ELA',
    grade: '5',
    format: 'NJSLA',
    scoringMethod: 'scale_score',
    scoreRange: { minScore: 650, maxScore: 850, scoreType: 'scale_score' },
    performanceLevels: [
      { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
      { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
      { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
      { level: 4, minScore: 750, maxScore: 798, description: 'Meeting' },
      { level: 5, minScore: 799, maxScore: 850, description: 'Exceeding' }
    ],
    subscores: { reading: true, writing: true, vocabulary: true },
    metadata: { vendor: 'NJSLA', description: 'New Jersey Student Learning Assessment ELA' }
  },
  'NJSLA_MATH_3': {
    assessmentType: 'NJSLA_MATH',
    displayName: 'NJSLA Mathematics Grade 3',
    subject: 'Mathematics',
    grade: '3',
    format: 'NJSLA',
    scoringMethod: 'scale_score',
    scoreRange: { minScore: 650, maxScore: 850, scoreType: 'scale_score' },
    performanceLevels: [
      { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
      { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
      { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
      { level: 4, minScore: 750, maxScore: 789, description: 'Meeting' },
      { level: 5, minScore: 790, maxScore: 850, description: 'Exceeding' }
    ],
    subscores: { standards: true },
    metadata: { vendor: 'NJSLA', description: 'New Jersey Student Learning Assessment Mathematics' }
  },
  'NJSLA_MATH_4': {
    assessmentType: 'NJSLA_MATH',
    displayName: 'NJSLA Mathematics Grade 4',
    subject: 'Mathematics',
    grade: '4',
    format: 'NJSLA',
    scoringMethod: 'scale_score',
    scoreRange: { minScore: 650, maxScore: 850, scoreType: 'scale_score' },
    performanceLevels: [
      { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
      { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
      { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
      { level: 4, minScore: 750, maxScore: 795, description: 'Meeting' },
      { level: 5, minScore: 796, maxScore: 850, description: 'Exceeding' }
    ],
    subscores: { standards: true },
    metadata: { vendor: 'NJSLA', description: 'New Jersey Student Learning Assessment Mathematics' }
  },
  'NJSLA_MATH_5': {
    assessmentType: 'NJSLA_MATH',
    displayName: 'NJSLA Mathematics Grade 5',
    subject: 'Mathematics',
    grade: '5',
    format: 'NJSLA',
    scoringMethod: 'scale_score',
    scoreRange: { minScore: 650, maxScore: 850, scoreType: 'scale_score' },
    performanceLevels: [
      { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
      { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
      { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
      { level: 4, minScore: 750, maxScore: 789, description: 'Meeting' },
      { level: 5, minScore: 790, maxScore: 850, description: 'Exceeding' }
    ],
    subscores: { standards: true },
    metadata: { vendor: 'NJSLA', description: 'New Jersey Student Learning Assessment Mathematics' }
  },
  
  // LinkIt NJSLS Form B Configurations
  'LINKIT_NJSLS_ELA_4_FORM_B': {
    assessmentType: 'LINKIT_NJSLS_ELA',
    displayName: 'LinkIt! NJSLS ELA Grade 4 Form B',
    subject: 'ELA',
    grade: '4',
    format: 'NJSLS_Form_B',
    scoringMethod: 'percent_score',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'percent_score' },
    performanceLevels: [
      { 
        level: 1, 
        minScore: 0, 
        maxScore: 39, 
        description: 'Partially Meeting',
        linkItText: ['Partially Meeting', 'Below Expectations', 'Not Meeting']
      },
      { 
        level: 2, 
        minScore: 40, 
        maxScore: 59, 
        description: 'Approaching',
        linkItText: ['Approaching', 'Partially Meeting']
      },
      { 
        level: 3, 
        minScore: 60, 
        maxScore: 79, 
        description: 'Meeting',
        linkItText: ['Meeting', 'Bubble']
      },
      { 
        level: 4, 
        minScore: 80, 
        maxScore: 100, 
        description: 'Exceeding',
        linkItText: ['Exceeding']
      }
    ],
    subscores: { reading: true, writing: true, vocabulary: true, standards: true },
    metadata: { 
      vendor: 'LinkIt!', 
      description: 'LinkIt! New Jersey Student Learning Standards ELA Form B',
      year: '2024-25'
    }
  },
  'LINKIT_NJSLS_MATH_4_FORM_B': {
    assessmentType: 'LINKIT_NJSLS_MATH',
    displayName: 'LinkIt! NJSLS Mathematics Grade 4 Form B',
    subject: 'Mathematics',
    grade: '4',
    format: 'NJSLS_Form_B',
    scoringMethod: 'percent_score',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'percent_score' },
    performanceLevels: [
      { 
        level: 1, 
        minScore: 0, 
        maxScore: 39, 
        description: 'Partially Meeting',
        linkItText: ['Partially Meeting', 'Below Expectations', 'Not Meeting']
      },
      { 
        level: 2, 
        minScore: 40, 
        maxScore: 59, 
        description: 'Approaching',
        linkItText: ['Approaching', 'Partially Meeting']
      },
      { 
        level: 3, 
        minScore: 60, 
        maxScore: 79, 
        description: 'Meeting',
        linkItText: ['Meeting', 'Bubble']
      },
      { 
        level: 4, 
        minScore: 80, 
        maxScore: 100, 
        description: 'Exceeding',
        linkItText: ['Exceeding']
      }
    ],
    subscores: { standards: true },
    metadata: { 
      vendor: 'LinkIt!', 
      description: 'LinkIt! New Jersey Student Learning Standards Mathematics Form B',
      year: '2024-25'
    }
  },

  // LinkIt NJSLS Form A Configurations
  'LINKIT_NJSLS_ELA_4_FORM_A': {
    assessmentType: 'LINKIT_NJSLS_ELA',
    displayName: 'LinkIt! NJSLS ELA Grade 4 Form A',
    subject: 'ELA',
    grade: '4',
    format: 'NJSLS_Form_A',
    scoringMethod: 'mixed',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'mixed' },
    performanceLevels: [
      { 
        level: 1, 
        minScore: 0, 
        maxScore: 39, 
        description: 'Below Expectations',
        linkItText: ['Below Expectations', 'Not Meeting']
      },
      { 
        level: 2, 
        minScore: 40, 
        maxScore: 59, 
        description: 'Partially Meeting',
        linkItText: ['Partially Meeting', 'Approaching']
      },
      { 
        level: 3, 
        minScore: 60, 
        maxScore: 79, 
        description: 'Meeting',
        linkItText: ['Meeting', 'Bubble']
      },
      { 
        level: 4, 
        minScore: 80, 
        maxScore: 100, 
        description: 'Exceeding',
        linkItText: ['Exceeding']
      }
    ],
    subscores: { reading: true, writing: true, vocabulary: true, standards: true },
    metadata: { 
      vendor: 'LinkIt!', 
      description: 'LinkIt! New Jersey Student Learning Standards ELA Form A',
      year: '2024-25'
    }
  },
  'LINKIT_NJSLS_MATH_4_FORM_A': {
    assessmentType: 'LINKIT_NJSLS_MATH',
    displayName: 'LinkIt! NJSLS Mathematics Grade 4 Form A',
    subject: 'Mathematics',
    grade: '4',
    format: 'NJSLS_Form_A',
    scoringMethod: 'mixed',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'mixed' },
    performanceLevels: [
      { 
        level: 1, 
        minScore: 0, 
        maxScore: 39, 
        description: 'Below Expectations',
        linkItText: ['Below Expectations', 'Not Meeting']
      },
      { 
        level: 2, 
        minScore: 40, 
        maxScore: 59, 
        description: 'Partially Meeting',
        linkItText: ['Partially Meeting', 'Approaching']
      },
      { 
        level: 3, 
        minScore: 60, 
        maxScore: 79, 
        description: 'Meeting',
        linkItText: ['Meeting', 'Bubble']
      },
      { 
        level: 4, 
        minScore: 80, 
        maxScore: 100, 
        description: 'Exceeding',
        linkItText: ['Exceeding']
      }
    ],
    subscores: { standards: true },
    metadata: { 
      vendor: 'LinkIt!', 
      description: 'LinkIt! New Jersey Student Learning Standards Mathematics Form A',
      year: '2024-25'
    }
  },

  // Start Strong Configurations
  'START_STRONG_ELA_4': {
    assessmentType: 'START_STRONG_ELA',
    displayName: 'Start Strong ELA Grade 4',
    subject: 'ELA',
    grade: '4',
    format: 'Start_Strong',
    scoringMethod: 'percent_score',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'percent_score' },
    performanceLevels: [
      { 
        level: 1, 
        minScore: 0, 
        maxScore: 39, 
        description: 'Strong Support May Be Needed',
        linkItText: ['Strong Support May Be Needed', 'Below Expectations', 'Not Meeting']
      },
      { 
        level: 2, 
        minScore: 40, 
        maxScore: 59, 
        description: 'Some Support May Be Needed',
        linkItText: ['Some Support May Be Needed', 'Partially Meeting', 'Approaching']
      },
      { 
        level: 3, 
        minScore: 60, 
        maxScore: 79, 
        description: 'Less Support May Be Needed',
        linkItText: ['Less Support May Be Needed', 'Meeting']
      },
      { 
        level: 4, 
        minScore: 80, 
        maxScore: 100, 
        description: 'Exceeding',
        linkItText: ['Exceeding']
      }
    ],
    subscores: { reading: true, writing: true, vocabulary: true },
    metadata: { 
      vendor: 'Start Strong', 
      description: 'Start Strong ELA Assessment',
      year: '2024-25'
    }
  },
  'START_STRONG_ELA_5': {
    assessmentType: 'START_STRONG_ELA',
    displayName: 'Start Strong ELA Grade 5',
    subject: 'ELA',
    grade: '5',
    format: 'Start_Strong',
    scoringMethod: 'percent_score',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'percent_score' },
    performanceLevels: [
      { 
        level: 1, 
        minScore: 0, 
        maxScore: 39, 
        description: 'Strong Support May Be Needed',
        linkItText: ['Strong Support May Be Needed', 'Below Expectations', 'Not Meeting']
      },
      { 
        level: 2, 
        minScore: 40, 
        maxScore: 59, 
        description: 'Some Support May Be Needed',
        linkItText: ['Some Support May Be Needed', 'Partially Meeting', 'Approaching']
      },
      { 
        level: 3, 
        minScore: 60, 
        maxScore: 79, 
        description: 'Less Support May Be Needed',
        linkItText: ['Less Support May Be Needed', 'Meeting']
      },
      { 
        level: 4, 
        minScore: 80, 
        maxScore: 100, 
        description: 'Exceeding',
        linkItText: ['Exceeding']
      }
    ],
    subscores: { reading: true, writing: true, vocabulary: true },
    metadata: { 
      vendor: 'Start Strong', 
      description: 'Start Strong ELA Assessment',
      year: '2024-25'
    }
  },
  'START_STRONG_MATH_4': {
    assessmentType: 'START_STRONG_MATH',
    displayName: 'Start Strong Mathematics Grade 4',
    subject: 'Mathematics',
    grade: '4',
    format: 'Start_Strong',
    scoringMethod: 'percent_score',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'percent_score' },
    performanceLevels: [
      { 
        level: 1, 
        minScore: 0, 
        maxScore: 39, 
        description: 'Strong Support May Be Needed',
        linkItText: ['Strong Support May Be Needed', 'Below Expectations', 'Not Meeting']
      },
      { 
        level: 2, 
        minScore: 40, 
        maxScore: 59, 
        description: 'Some Support May Be Needed',
        linkItText: ['Some Support May Be Needed', 'Partially Meeting', 'Approaching']
      },
      { 
        level: 3, 
        minScore: 60, 
        maxScore: 79, 
        description: 'Less Support May Be Needed',
        linkItText: ['Less Support May Be Needed', 'Meeting']
      },
      { 
        level: 4, 
        minScore: 80, 
        maxScore: 100, 
        description: 'Exceeding',
        linkItText: ['Exceeding']
      }
    ],
    subscores: { standards: true },
    metadata: { 
      vendor: 'Start Strong', 
      description: 'Start Strong Mathematics Assessment',
      year: '2024-25'
    }
  },
  'START_STRONG_MATH_5': {
    assessmentType: 'START_STRONG_MATH',
    displayName: 'Start Strong Mathematics Grade 5',
    subject: 'Mathematics',
    grade: '5',
    format: 'Start_Strong',
    scoringMethod: 'percent_score',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'percent_score' },
    performanceLevels: [
      { 
        level: 1, 
        minScore: 0, 
        maxScore: 39, 
        description: 'Strong Support May Be Needed',
        linkItText: ['Strong Support May Be Needed', 'Below Expectations', 'Not Meeting']
      },
      { 
        level: 2, 
        minScore: 40, 
        maxScore: 59, 
        description: 'Some Support May Be Needed',
        linkItText: ['Some Support May Be Needed', 'Partially Meeting', 'Approaching']
      },
      { 
        level: 3, 
        minScore: 60, 
        maxScore: 79, 
        description: 'Less Support May Be Needed',
        linkItText: ['Less Support May Be Needed', 'Meeting']
      },
      { 
        level: 4, 
        minScore: 80, 
        maxScore: 100, 
        description: 'Exceeding',
        linkItText: ['Exceeding']
      }
    ],
    subscores: { standards: true },
    metadata: { 
      vendor: 'Start Strong', 
      description: 'Start Strong Mathematics Assessment',
      year: '2024-25'
    }
  },
  // Grade 5 Form A/B Configurations
  'LINKIT_NJSLS_ELA_5_FORM_A': {
    assessmentType: 'LINKIT_NJSLS_ELA',
    displayName: 'LinkIt! NJSLS ELA Grade 5 Form A',
    subject: 'ELA',
    grade: '5',
    format: 'NJSLS_Form_A',
    scoringMethod: 'mixed',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'mixed' },
    performanceLevels: [
      { level: 1, minScore: 0, maxScore: 39, description: 'Below Expectations', linkItText: ['Below Expectations', 'Not Meeting'] },
      { level: 2, minScore: 40, maxScore: 59, description: 'Partially Meeting', linkItText: ['Partially Meeting', 'Approaching'] },
      { level: 3, minScore: 60, maxScore: 79, description: 'Meeting', linkItText: ['Meeting', 'Bubble'] },
      { level: 4, minScore: 80, maxScore: 100, description: 'Exceeding', linkItText: ['Exceeding'] }
    ],
    subscores: { reading: true, writing: true, vocabulary: true, standards: true },
    metadata: { vendor: 'LinkIt!', description: 'LinkIt! New Jersey Student Learning Standards ELA Form A', year: '2024-25' }
  },
  'LINKIT_NJSLS_ELA_5_FORM_B': {
    assessmentType: 'LINKIT_NJSLS_ELA',
    displayName: 'LinkIt! NJSLS ELA Grade 5 Form B',
    subject: 'ELA',
    grade: '5',
    format: 'NJSLS_Form_B',
    scoringMethod: 'percent_score',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'percent_score' },
    performanceLevels: [
      { level: 1, minScore: 0, maxScore: 39, description: 'Partially Meeting', linkItText: ['Partially Meeting', 'Below Expectations', 'Not Meeting'] },
      { level: 2, minScore: 40, maxScore: 59, description: 'Approaching', linkItText: ['Approaching', 'Partially Meeting'] },
      { level: 3, minScore: 60, maxScore: 79, description: 'Meeting', linkItText: ['Meeting', 'Bubble'] },
      { level: 4, minScore: 80, maxScore: 100, description: 'Exceeding', linkItText: ['Exceeding'] }
    ],
    subscores: { reading: true, writing: true, vocabulary: true, standards: true },
    metadata: { vendor: 'LinkIt!', description: 'LinkIt! New Jersey Student Learning Standards ELA Form B', year: '2024-25' }
  },
  'LINKIT_NJSLS_MATH_5_FORM_A': {
    assessmentType: 'LINKIT_NJSLS_MATH',
    displayName: 'LinkIt! NJSLS Mathematics Grade 5 Form A',
    subject: 'Mathematics',
    grade: '5',
    format: 'NJSLS_Form_A',
    scoringMethod: 'mixed',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'mixed' },
    performanceLevels: [
      { level: 1, minScore: 0, maxScore: 39, description: 'Below Expectations', linkItText: ['Below Expectations', 'Not Meeting'] },
      { level: 2, minScore: 40, maxScore: 59, description: 'Partially Meeting', linkItText: ['Partially Meeting', 'Approaching'] },
      { level: 3, minScore: 60, maxScore: 79, description: 'Meeting', linkItText: ['Meeting', 'Bubble'] },
      { level: 4, minScore: 80, maxScore: 100, description: 'Exceeding', linkItText: ['Exceeding'] }
    ],
    subscores: { standards: true },
    metadata: { vendor: 'LinkIt!', description: 'LinkIt! New Jersey Student Learning Standards Mathematics Form A', year: '2024-25' }
  },
  'LINKIT_NJSLS_MATH_5_FORM_B': {
    assessmentType: 'LINKIT_NJSLS_MATH',
    displayName: 'LinkIt! NJSLS Mathematics Grade 5 Form B',
    subject: 'Mathematics',
    grade: '5',
    format: 'NJSLS_Form_B',
    scoringMethod: 'percent_score',
    scoreRange: { minScore: 0, maxScore: 100, scoreType: 'percent_score' },
    performanceLevels: [
      { level: 1, minScore: 0, maxScore: 39, description: 'Partially Meeting', linkItText: ['Partially Meeting', 'Below Expectations', 'Not Meeting'] },
      { level: 2, minScore: 40, maxScore: 59, description: 'Approaching', linkItText: ['Approaching', 'Partially Meeting'] },
      { level: 3, minScore: 60, maxScore: 79, description: 'Meeting', linkItText: ['Meeting', 'Bubble'] },
      { level: 4, minScore: 80, maxScore: 100, description: 'Exceeding', linkItText: ['Exceeding'] }
    ],
    subscores: { standards: true },
    metadata: { vendor: 'LinkIt!', description: 'LinkIt! New Jersey Student Learning Standards Mathematics Form B', year: '2024-25' }
  }
};

// NJSLA Score Ranges for all grades and subjects (keeping for backward compatibility)
export const NJSLA_SCORE_RANGES: NJSLAGradeConfig = {
  '3': {
    'ELA': {
      minScore: 650,
      maxScore: 850,
      performanceLevels: [
        { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
        { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
        { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
        { level: 4, minScore: 750, maxScore: 809, description: 'Meeting' },
        { level: 5, minScore: 810, maxScore: 850, description: 'Exceeding' }
      ]
    },
    'Mathematics': {
      minScore: 650,
      maxScore: 850,
      performanceLevels: [
        { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
        { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
        { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
        { level: 4, minScore: 750, maxScore: 789, description: 'Meeting' },
        { level: 5, minScore: 790, maxScore: 850, description: 'Exceeding' }
      ]
    },
    'Science': {
      minScore: 650,
      maxScore: 850,
      performanceLevels: [
        { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
        { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
        { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
        { level: 4, minScore: 750, maxScore: 850, description: 'Meeting' }
      ]
    }
  },
  '4': {
    'ELA': {
      minScore: 650,
      maxScore: 850,
      performanceLevels: [
        { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
        { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
        { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
        { level: 4, minScore: 750, maxScore: 789, description: 'Meeting' },
        { level: 5, minScore: 790, maxScore: 850, description: 'Exceeding' }
      ]
    },
    'Mathematics': {
      minScore: 650,
      maxScore: 850,
      performanceLevels: [
        { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
        { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
        { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
        { level: 4, minScore: 750, maxScore: 795, description: 'Meeting' },
        { level: 5, minScore: 796, maxScore: 850, description: 'Exceeding' }
      ]
    },
    'Science': {
      minScore: 650,
      maxScore: 850,
      performanceLevels: [
        { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
        { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
        { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
        { level: 4, minScore: 750, maxScore: 850, description: 'Meeting' }
      ]
    }
  },
  '5': {
    'ELA': {
      minScore: 650,
      maxScore: 850,
      performanceLevels: [
        { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
        { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
        { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
        { level: 4, minScore: 750, maxScore: 798, description: 'Meeting' },
        { level: 5, minScore: 799, maxScore: 850, description: 'Exceeding' }
      ]
    },
    'Mathematics': {
      minScore: 650,
      maxScore: 850,
      performanceLevels: [
        { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
        { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
        { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
        { level: 4, minScore: 750, maxScore: 789, description: 'Meeting' },
        { level: 5, minScore: 790, maxScore: 850, description: 'Exceeding' }
      ]
    },
    'Science': {
      minScore: 650,
      maxScore: 850,
      performanceLevels: [
        { level: 1, minScore: 650, maxScore: 699, description: 'Partially Meeting' },
        { level: 2, minScore: 700, maxScore: 724, description: 'Approaching' },
        { level: 3, minScore: 725, maxScore: 749, description: 'Meeting' },
        { level: 4, minScore: 750, maxScore: 850, description: 'Meeting' }
      ]
    }
  }
};

// NJSLA Scoring Engine
export class NJSLAScoringEngine {
  
  /**
   * Get assessment configuration by key
   */
  getAssessmentConfig(assessmentKey: string): AssessmentConfig | null {
    return ASSESSMENT_CONFIGS[assessmentKey] || null;
  }

  /**
   * Find assessment configuration by header analysis
   */
  findAssessmentConfig(headers: string[]): AssessmentConfig | null {
    const headerString = headers.join(' ').toLowerCase();
    
    // Try to find exact match first
    for (const [key, config] of Object.entries(ASSESSMENT_CONFIGS)) {
      if (this.matchesAssessmentConfig(headerString, config)) {
        console.log(`✅ Found assessment config: ${key}`);
        return config;
      }
    }
    
    // Fallback to pattern matching
    return this.findAssessmentConfigByPattern(headerString);
  }

  /**
   * Check if headers match a specific assessment configuration
   */
  private matchesAssessmentConfig(headerString: string, config: AssessmentConfig): boolean {
    // Check for subject match
    const subjectMatch = headerString.includes(config.subject.toLowerCase());
    
    // Check for grade match
    const gradeMatch = headerString.includes(`gr ${config.grade}`) || 
                      headerString.includes(`grade ${config.grade}`);
    
    // Check for format match
    let formatMatch = false;
    switch (config.format) {
      case 'NJSLA':
        formatMatch = headerString.includes('njsla');
        break;
      case 'NJSLS_Form_B':
        formatMatch = headerString.includes('njsls') && headerString.includes('form b');
        break;
      case 'NJSLS_Form_A':
        formatMatch = headerString.includes('njsls') && headerString.includes('form a');
        break;
      case 'Start_Strong':
        formatMatch = headerString.includes('start strong') || 
                     headerString.includes('startstrong') ||
                     (headerString.includes('literature') && headerString.includes('informational') && headerString.includes('percent'));
        break;
      case 'Custom':
        formatMatch = true; // Custom formats match by default
        break;
    }
    
    return subjectMatch && gradeMatch && formatMatch;
  }

  /**
   * Find assessment configuration by pattern matching
   */
  private findAssessmentConfigByPattern(headerString: string): AssessmentConfig | null {
    // Extract subject and grade
    let subject: 'ELA' | 'Mathematics' | 'Science' | null = null;
    let grade: string | null = null;
    let format: string | null = null;
    
    // Detect subject
    if (headerString.includes('ela') || headerString.includes('english')) {
      subject = 'ELA';
    } else if (headerString.includes('math')) {
      subject = 'Mathematics';
    } else if (headerString.includes('science')) {
      subject = 'Science';
    }
    
    // Detect grade
    const gradeMatch = headerString.match(/gr\s*(\d+)|grade\s*(\d+)/i);
    if (gradeMatch) {
      grade = gradeMatch[1] || gradeMatch[2];
    }
    
    // Enhanced format detection with priority order
    if (headerString.includes('start strong') || 
        headerString.includes('startstrong') ||
        (headerString.includes('literature') && headerString.includes('informational') && headerString.includes('percent'))) {
      format = 'Start_Strong';
    } else if (headerString.includes('njsls') && headerString.includes('form b')) {
      format = 'NJSLS_Form_B';
    } else if (headerString.includes('njsls') && headerString.includes('form a')) {
      format = 'NJSLS_Form_A';
    } else if (headerString.includes('njsls')) {
      format = 'NJSLS_Form_A'; // Default to Form A for generic NJSLS
    } else if (headerString.includes('njsla')) {
      format = 'NJSLA';
    }
    
    // Try to find matching config
    if (subject && grade && format) {
      let configKey: string;
      
      // Map subject to config key format (Mathematics -> MATH)
      const subjectKey = subject === 'Mathematics' ? 'MATH' : subject.toUpperCase();
      
      if (format === 'Start_Strong') {
        configKey = `START_STRONG_${subjectKey}_${grade}`;
      } else if (format === 'NJSLS_Form_B') {
        configKey = `LINKIT_NJSLS_${subjectKey}_${grade}_FORM_B`;
      } else if (format === 'NJSLS_Form_A') {
        configKey = `LINKIT_NJSLS_${subjectKey}_${grade}_FORM_A`;
      } else if (format === 'NJSLA') {
        configKey = `NJSLA_${subjectKey}_${grade}`;
      } else {
        return null;
      }
      
      console.log(`🔍 Pattern matching found config key: ${configKey}`);
      return ASSESSMENT_CONFIGS[configKey] || null;
    }
    
    return null;
  }

  /**
   * Get score range for a specific grade and subject (backward compatibility)
   */
  getScoreRange(grade: string, subject: 'ELA' | 'Mathematics' | 'Science'): NJSLAScoreRange | null {
    const gradeData = NJSLA_SCORE_RANGES[grade];
    if (!gradeData) return null;
    
    const scoreRange = gradeData[subject];
    if (!scoreRange) return null;
    
    return scoreRange;
  }

  /**
   * Get score range from assessment configuration
   */
  getScoreRangeFromConfig(assessmentKey: string): { minScore: number; maxScore: number; scoreType: string } | null {
    const config = this.getAssessmentConfig(assessmentKey);
    if (!config) return null;
    
    return config.scoreRange;
  }

  /**
   * Calculate performance level from score using assessment configuration
   */
  calculatePerformanceLevelFromConfig(score: number, assessmentKey: string): {
    level: number;
    description: string;
  } | null {
    const config = this.getAssessmentConfig(assessmentKey);
    if (!config) return null;

    for (const level of config.performanceLevels) {
      if (score >= level.minScore && score <= level.maxScore) {
        return {
          level: level.level,
          description: level.description
        };
      }
    }

    return null;
  }

  /**
   * Calculate performance level from scale score (backward compatibility)
   */
  calculatePerformanceLevel(scaleScore: number, grade: string, subject: 'ELA' | 'Mathematics' | 'Science'): {
    level: number;
    description: string;
  } | null {
    const scoreRange = this.getScoreRange(grade, subject);
    if (!scoreRange) return null;

    for (const level of scoreRange.performanceLevels) {
      if (scaleScore >= level.minScore && scaleScore <= level.maxScore) {
        return {
          level: level.level,
          description: level.description
        };
      }
    }

    return null;
  }

  /**
   * Map LinkIt performance level text to numeric level using assessment configuration
   */
  mapLinkItPerformanceLevelFromConfig(linkItLevel: string, assessmentKey: string): number {
    const config = this.getAssessmentConfig(assessmentKey);
    if (!config) return 0;

    console.log(`🔍 Mapping performance level: "${linkItLevel}" for config: ${assessmentKey}`);

    for (const level of config.performanceLevels) {
      if (level.linkItText) {
        // Try exact match first
        if (level.linkItText.some(text => 
          linkItLevel.toLowerCase() === text.toLowerCase()
        )) {
          console.log(`✅ Exact match found: "${linkItLevel}" -> Level ${level.level} (${level.description})`);
          return level.level;
        }
        
        // Fallback to includes match for backward compatibility
        if (level.linkItText.some(text => 
          linkItLevel.toLowerCase().includes(text.toLowerCase())
        )) {
          console.log(`⚠️ Partial match found: "${linkItLevel}" -> Level ${level.level} (${level.description})`);
          return level.level;
        }
      }
    }

    console.log(`❌ No match found for: "${linkItLevel}"`);
    return 0;
  }

  /**
   * Validate score is within valid range for assessment configuration
   */
  validateScoreFromConfig(score: number, assessmentKey: string): boolean {
    const config = this.getAssessmentConfig(assessmentKey);
    if (!config) return false;
    
    return score >= config.scoreRange.minScore && score <= config.scoreRange.maxScore;
  }

  /**
   * Validate scale score is within valid range (backward compatibility)
   */
  validateScaleScore(scaleScore: number, grade: string, subject: 'ELA' | 'Mathematics' | 'Science'): boolean {
    const scoreRange = this.getScoreRange(grade, subject);
    if (!scoreRange) return false;
    
    return scaleScore >= scoreRange.minScore && scaleScore <= scoreRange.maxScore;
  }

  /**
   * Get available grades for a specific subject
   */
  getAvailableGrades(subject: 'ELA' | 'Mathematics' | 'Science'): string[] {
    const grades: string[] = [];
    
    for (const grade in NJSLA_SCORE_RANGES) {
      const gradeData = NJSLA_SCORE_RANGES[grade];
      if (gradeData[subject]) {
        grades.push(grade);
      }
    }
    
    return grades.sort();
  }

  /**
   * Get performance level distribution for a set of scores
   */
  getPerformanceLevelDistribution(scores: Array<{scaleScore: number, grade: string, subject: 'ELA' | 'Mathematics' | 'Science'}>): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    scores.forEach(({ scaleScore, grade, subject }) => {
      const performanceLevel = this.calculatePerformanceLevel(scaleScore, grade, subject);
      if (performanceLevel) {
        const key = `Level ${performanceLevel.level}`;
        distribution[key] = (distribution[key] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * Map LinkIt performance level text to NJSLA standard
   */
  mapLinkItPerformanceLevel(linkItLevel: string): string {
    const mapping: Record<string, string> = {
      // Start Strong specific
      'Less Support May Be Needed': 'Less Support May Be Needed',
      'Some Support May Be Needed': 'Some Support May Be Needed',
      'Strong Support May Be Needed': 'Strong Support May Be Needed',
      
      // LinkIt NJSLS Form A & B
      'Exceeding': 'Exceeding',
      'Meeting': 'Meeting',
      'Approaching': 'Approaching',
      'Partially Meeting': 'Partially Meeting',
      'Bubble': 'Meeting', // Form B specific - maps to Meeting
      
      // Traditional NJSLA
      'Met Expectations': 'Meeting',
      'Exceeded Expectations': 'Exceeding',
      'Approached Expectations': 'Approaching',
      'Partially Met Expectations': 'Partially Meeting',
      'Did Not Yet Meet Expectations': 'Partially Meeting',
      
      // Legacy mappings for backward compatibility
      'Below Expectations': 'Partially Meeting',
      'Not Meeting': 'Partially Meeting',
      'Near Expectations': 'Approaching',
      'Meets or Exceeds Expectations': 'Meeting'
    };

    return mapping[linkItLevel] || linkItLevel;
  }

  /**
   * Map subscore level text to numeric value
   */
  mapSubscoreLevel(levelText: string): number {
    const mapping: Record<string, number> = {
      'Below Expectations': 1,
      'Near Expectations': 2,
      'Meets or Exceeds Expectations': 3,
      'Exceeds Expectations': 4
    };

    return mapping[levelText] || 0;
  }

  /**
   * Validate ELA subscore requirements
   */
  validateELASubscores(readingScore: number, writingScore: number): boolean {
    // A student needs Reading ≥ 50 and Writing ≥ 35 to meet expectations
    return readingScore >= 50 && writingScore >= 35;
  }

  /**
   * Calculate overall assessment statistics
   */
  calculateAssessmentStatistics(results: Array<{
    scaleScore: number;
    grade: string;
    subject: 'ELA' | 'Mathematics' | 'Science';
  }>): {
    totalStudents: number;
    averageScore: number;
    performanceLevelDistribution: Record<string, number>;
    meetingExpectations: number;
    exceedingExpectations: number;
  } {
    const totalStudents = results.length;
    const averageScore = results.reduce((sum, r) => sum + r.scaleScore, 0) / totalStudents;
    
    const distribution = this.getPerformanceLevelDistribution(results);
    
    const meetingExpectations = (distribution['Level 4'] || 0) + (distribution['Level 5'] || 0);
    const exceedingExpectations = distribution['Level 5'] || 0;

    return {
      totalStudents,
      averageScore: Math.round(averageScore * 100) / 100,
      performanceLevelDistribution: distribution,
      meetingExpectations,
      exceedingExpectations
    };
  }

  /**
   * Detect assessment type and grade from column headers (enhanced)
   */
  detectAssessmentFromHeaders(headers: string[]): {
    assessmentType: string;
    subject: 'ELA' | 'Mathematics' | 'Science' | null;
    grade: string | null;
    configKey: string | null;
  } {
    console.log('🔍 Enhanced assessment detection for headers:', headers.slice(0, 5));
    
    // Try to find assessment configuration first
    const config = this.findAssessmentConfig(headers);
    if (config) {
      console.log('✅ Found assessment config:', config.assessmentType);
      
      // Generate the correct config key using the same logic as the fallback
      const subjectKey = config.subject === 'Mathematics' ? 'MATH' : config.subject.toUpperCase();
      let configKey: string;
      
      if (config.format === 'Start_Strong') {
        configKey = `START_STRONG_${subjectKey}_${config.grade}`;
      } else if (config.format === 'NJSLS_Form_B') {
        configKey = `LINKIT_NJSLS_${subjectKey}_${config.grade}_FORM_B`;
      } else if (config.format === 'NJSLS_Form_A') {
        configKey = `LINKIT_NJSLS_${subjectKey}_${config.grade}_FORM_A`;
      } else if (config.format === 'NJSLA') {
        configKey = `NJSLA_${subjectKey}_${config.grade}`;
      } else {
        configKey = `${config.format.toUpperCase()}_${subjectKey}_${config.grade}`;
      }
      
      return {
        assessmentType: config.assessmentType,
        subject: config.subject,
        grade: config.grade,
        configKey: configKey
      };
    }
    
    // Fallback to original logic
    const headerString = headers.join(' ').toLowerCase();
    
    let subject: 'ELA' | 'Mathematics' | 'Science' | null = null;
    let grade: string | null = null;
    let assessmentType = 'Unknown';

   // Detect subject (strip grade number from subject if present)
// Detect subject (strip grade number from subject if present)
if (headerString.includes('ela') || headerString.includes('english')) {
  subject = 'ELA';
} else if (headerString.includes('math') && !headerString.includes('replacement')) {
  subject = 'Mathematics';
} else if (headerString.includes('science')) {
  subject = 'Science';
} else if (headerString.includes('replacement mathematics')) {
  subject = 'Replacement Mathematics' as any;
  assessmentType = 'LINKIT_NJSLS_REPLACEMENT_MATHEMATICS';
} else if (headerString.includes('replacement language arts')) {
  subject = 'Replacement Language Arts' as any;
  assessmentType = 'LINKIT_NJSLS_REPLACEMENT_LANGUAGE_ARTS';
} else if (headerString.includes('language arts') || headerString.includes('la ')) {
  subject = 'LA' as any;
  assessmentType = 'LINKIT_NJSLS_LA';
} else if (headerString.includes('spanish')) {
  subject = 'Spanish' as any;
  assessmentType = 'LINKIT_NJSLS_SPANISH';
} else if (headerString.includes('technology')) {
  subject = 'Technology Education' as any;
  assessmentType = 'LINKIT_NJSLS_TECHNOLOGY_EDUCATION';
} else if (headerString.includes('social studies')) {
  subject = 'Social Studies' as any;
  assessmentType = 'LINKIT_NJSLS_SOCIAL_STUDIES';
} else if (headerString.includes('physical education')) {
  subject = 'Physical Education' as any;
  assessmentType = 'LINKIT_NJSLS_PHYSICAL_EDUCATION';
} else if (headerString.includes('music')) {
  subject = 'Music' as any;
  assessmentType = 'LINKIT_NJSLS_MUSIC';
} else if (headerString.includes('health')) {
  subject = 'Health' as any;
  assessmentType = 'LINKIT_NJSLS_HEALTH';
} else if (headerString.includes('art') && !headerString.includes('language arts')) {
  subject = 'Art' as any;
  assessmentType = 'LINKIT_NJSLS_ART';
} else if (headerString.includes('band')) {
  subject = 'Band' as any;
  assessmentType = 'LINKIT_NJSLS_BAND';
} else if (headerString.includes('5sel')) {
  subject = 'SEL' as any;
  assessmentType = 'LINKIT_NJSLS_SEL';
}

    // Detect grade - return in format that matches NJSLA_SCORE_RANGES keys
    const gradeMatch = headerString.match(/gr\s*(\d+)|grade\s*(\d+)/i);
    if (gradeMatch) {
      grade = gradeMatch[1] || gradeMatch[2]; // Return simple number format: '3', '4', '5'
    }

    // Detect specific math courses for high school
    if (headerString.includes('algebra i')) {
      grade = 'Algebra_I';
    } else if (headerString.includes('algebra ii')) {
      grade = 'Algebra_II';
    } else if (headerString.includes('geometry')) {
      grade = 'Geometry';
    }

    // Enhanced assessment type detection with priority order
    if (headerString.includes('start strong')) {
      // Start Strong assessments
      assessmentType = `START_STRONG_${subject || 'Unknown'}`;
    } else if (headerString.includes('njsls') && headerString.includes('form b')) {
      // LinkIt NJSLS Form B
      assessmentType = `LINKIT_NJSLS_${subject || 'Unknown'}`;
    } else if (headerString.includes('njsls') && headerString.includes('form a')) {
      // LinkIt NJSLS Form A
      assessmentType = `LINKIT_NJSLS_${subject || 'Unknown'}`;
    } else if (headerString.includes('njsls')) {
      // Generic LinkIt NJSLS (default to Form A)
      assessmentType = `LINKIT_NJSLS_${subject || 'Unknown'}`;
    } else if (headerString.includes('njsla')) {
      // Traditional NJSLA
      assessmentType = `NJSLA_${subject || 'Unknown'}`;
    } else if (headerString.includes('linkit')) {
      // Generic LinkIt
      assessmentType = `LINKIT_${subject || 'Unknown'}`;
    }

    // Try to determine the specific config key for better matching
    let configKey: string | null = null;
    
    if (assessmentType !== 'Unknown' && subject && grade) {
      // Map subject to config key format (Mathematics -> MATH)
      const subjectKey = subject === 'Mathematics' ? 'MATH' : subject.toUpperCase();
      
      if (headerString.includes('start strong')) {
        configKey = `START_STRONG_${subjectKey}_${grade}`;
      } else if (headerString.includes('njsls') && headerString.includes('form b')) {
        configKey = `LINKIT_NJSLS_${subjectKey}_${grade}_FORM_B`;
      } else if (headerString.includes('njsls') && headerString.includes('form a')) {
        configKey = `LINKIT_NJSLS_${subjectKey}_${grade}_FORM_A`;
      } else if (headerString.includes('njsls')) {
        // Default to Form A for generic NJSLS
        configKey = `LINKIT_NJSLS_${subjectKey}_${grade}_FORM_A`;
      } else if (headerString.includes('njsla')) {
        configKey = `NJSLA_${subjectKey}_${grade}`;
      }
    }

    console.log('🔍 Assessment detection result:', {
      assessmentType,
      subject,
      grade,
      configKey,
      headerString: headerString.substring(0, 100) + '...'
    });

    return { assessmentType, subject, grade, configKey };
  }
}

// Export singleton instance
export const njslaScoringEngine = new NJSLAScoringEngine(); 