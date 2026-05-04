import {
  fetchProfileVitalsRemote,
  ProfileVitals,
  writeProfileVitalsCache,
  readProfileVitalsCache,
} from '@/utils/profileVitals';
import { supabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock supabase
jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('ProfileVitals utils', () => {
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchProfileVitalsRemote', () => {
    it('should return null when user not found', async () => {
      (supabase as any).maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await fetchProfileVitalsRemote(mockUserId);
      expect(result).toBeNull();
      expect((supabase as any).from).toHaveBeenCalledWith('profiles');
      expect((supabase as any).select).toHaveBeenCalled();
      expect((supabase as any).eq).toHaveBeenCalledWith('id', mockUserId);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      (supabase as any).maybeSingle.mockResolvedValue({ data: null, error });

      await expect(fetchProfileVitalsRemote(mockUserId)).rejects.toThrow('Database error');
    });

    it('should map all fields correctly when all data present', async () => {
      const mockData = {
        setup_completed: true,
        payday_day: 25,
        interests: ['Tech', 'Fashion'],
        stable_salary: 5000.50,
        auto_tax: true,
        side_income: 1000.25,
        rent: 1200.00,
        tithe_remittance: 300.00,
        debt_obligations: 500.00,
        utilities_mode: 'precise',
        utilities_total: 200.00,
        utilities_ecg: 120.00,
        utilities_water: 80.00,
        primary_goal: 'emergency_fund',
        strategy: 'balanced',
        needs_pct: 0.5,
        wants_pct: 0.3,
        savings_pct: 0.2,
        life_stage: 'young_professional',
        spending_style: 'moderate',
        financial_priority: 'savings_growth',
        income_frequency: 'bi_weekly',
        dependents_count: 2,
        profile_version: 1,
      };

      (supabase as any).maybeSingle.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchProfileVitalsRemote(mockUserId);

      expect(result).toEqual({
        setup_completed: true,
        payday_day: 25,
        interests: ['Tech', 'Fashion'],
        stable_salary: 5000.50,
        auto_tax: true,
        side_income: 1000.25,
        rent: 1200.00,
        tithe_remittance: 300.00,
        debt_obligations: 500.00,
        utilities_mode: 'precise',
        utilities_total: 200.00,
        utilities_ecg: 120.00,
        utilities_water: 80.00,
        primary_goal: 'emergency_fund',
        strategy: 'balanced',
        needs_pct: 0.5,
        wants_pct: 0.3,
        savings_pct: 0.2,
        life_stage: 'young_professional',
        spending_style: 'moderate',
        financial_priority: 'savings_growth',
        income_frequency: 'bi_weekly',
        dependents_count: 2,
        profile_version: 1,
      });
    });

    it('should handle null/undefined values and provide defaults', async () => {
      const mockData = {
        setup_completed: false,
        payday_day: null,
        interests: null,
        stable_salary: null,
        auto_tax: null,
        side_income: null,
        rent: null,
        tithe_remittance: null,
        debt_obligations: null,
        utilities_mode: null,
        utilities_total: null,
        utilities_ecg: null,
        utilities_water: null,
        primary_goal: null,
        strategy: null,
        needs_pct: null,
        wants_pct: null,
        savings_pct: null,
        life_stage: null,
        spending_style: null,
        financial_priority: null,
        income_frequency: null,
        dependents_count: null,
        profile_version: null,
      };

      (supabase as any).maybeSingle.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchProfileVitalsRemote(mockUserId);

      expect(result).toEqual({
        setup_completed: false,
        payday_day: null,
        interests: [],
        stable_salary: 0,
        auto_tax: false,
        side_income: 0,
        rent: 0,
        tithe_remittance: 0,
        debt_obligations: 0,
        utilities_mode: 'general',
        utilities_total: 0,
        utilities_ecg: 0,
        utilities_water: 0,
        primary_goal: null,
        strategy: null,
        needs_pct: null,
        wants_pct: null,
        savings_pct: null,
        life_stage: null,
        spending_style: null,
        financial_priority: null,
        income_frequency: 'monthly',
        dependents_count: 0,
        profile_version: 0,
      });
    });

    it('should validate life_stage enum values', async () => {
      const mockData = {
        setup_completed: true,
        payday_day: 25,
        interests: [],
        stable_salary: 3000,
        auto_tax: false,
        side_income: 0,
        rent: 0,
        tithe_remittance: 0,
        debt_obligations: 0,
        utilities_mode: 'general',
        utilities_total: 0,
        utilities_ecg: 0,
        utilities_water: 0,
        primary_goal: null,
        strategy: 'survival',
        needs_pct: 0.4,
        wants_pct: 0.4,
        savings_pct: 0.2,
        life_stage: 'invalid_stage', // This should be filtered out
        spending_style: 'invalid_style',
        financial_priority: 'invalid_priority',
        income_frequency: 'invalid_freq',
        dependents_count: 5,
        profile_version: 2,
      };

      (supabase as any).maybeSingle.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchProfileVitalsRemote(mockUserId);

      expect(result!.life_stage).toBeNull();
      expect(result!.spending_style).toBeNull();
      expect(result!.financial_priority).toBeNull();
      expect(result!.income_frequency).toBe('monthly'); // fallback
      expect(result!.dependents_count).toBe(5);
      expect(result!.profile_version).toBe(2);
    });
  });

  describe('writeProfileVitalsCache and readProfileVitalsCache', () => {
    it('should correctly cache and retrieve profile vitals', async () => {
      const mockVitals: ProfileVitals = {
        setup_completed: true,
        payday_day: 25,
        interests: ['Tech', 'Food'],
        stable_salary: 4000,
        auto_tax: true,
        side_income: 500,
        rent: 800,
        tithe_remittance: 200,
        debt_obligations: 300,
        utilities_mode: 'precise',
        utilities_total: 150,
        utilities_ecg: 90,
        utilities_water: 60,
        primary_goal: 'project',
        strategy: 'aggressive',
        needs_pct: 0.4,
        wants_pct: 0.35,
        savings_pct: 0.25,
        life_stage: 'family',
        spending_style: 'liberal',
        financial_priority: 'lifestyle',
        income_frequency: 'weekly',
        dependents_count: 1,
        profile_version: 1,
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ vitals: mockVitals, updatedAt: new Date().toISOString() })
      );

      await writeProfileVitalsCache(mockUserId, mockVitals);
      const cached = await readProfileVitalsCache(mockUserId);

      expect(cached).toBeDefined();
      expect(cached?.vitals).toEqual(mockVitals);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@cediwise_profile_vitals:test-user-id',
        expect.stringContaining('"profile_version":1')
      );
    });

    it('should return null when cache is empty or invalid', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      let result = await readProfileVitalsCache(mockUserId);
      expect(result).toBeNull();

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');
      result = await readProfileVitalsCache(mockUserId);
      expect(result).toBeNull();

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ vitals: {}, updatedAt: 'not-a-date' })
      );
      result = await readProfileVitalsCache(mockUserId);
      expect(result).toBeNull();
    });
  });
});