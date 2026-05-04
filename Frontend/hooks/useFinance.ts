"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { auth } from '@/lib/firebase';
import {
  Budget,
  Transaction,
  addBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  addTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getUserSummary,
  initializeUserData
} from '@/lib/firebase-db';

interface FinanceSummary {
  totalCredit: number;
  totalDebit: number;
  balance: number;
  totalBudget: number;
  totalSpent: number;
  budgetUtilization: number;
  transactionCount: number;
  activeBudgetCount: number;
  totalBudgetCount: number;
}

export const useFinance = () => {
  // SSR protection
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);

  // auth is imported from lib/firebase

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [credits, setCredits] = useState<Transaction[]>([]);
  const [debits, setDebits] = useState<Transaction[]>([]);

  // Initialize user data if needed
  const initializeUser = async () => {
    if (!user || !auth) return;
    try {
      await initializeUserData();
    } catch (err: any) {
      console.error('Error initializing user data:', err);
      setError(err.message);
    }
  };

  // Client-side effect and auth state listener
  useEffect(() => {
    setIsClient(true);

    if (!auth) return;

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      console.log('Auth state changed:', currentUser?.uid);
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Load all data with memoization
  const loadData = useCallback(async () => {
    if (!isClient || !user || !auth) {
      console.log('Cannot load data - missing requirements:', { isClient, user: !!user, auth: !!auth });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Loading data for user:', user.uid);

      // First ensure user data is initialized
      await initializeUser();

      const [budgetsData, creditsData, debitsData, summaryData] = await Promise.all([
        getBudgets(),
        getTransactions('credit'),
        getTransactions('debit'),
        getUserSummary()
      ]);

      console.log('Data loaded successfully:', {
        budgets: budgetsData.length,
        credits: creditsData.length,
        debits: debitsData.length,
        summary: !!summaryData
      });

      setBudgets(budgetsData);
      setCredits(creditsData);
      setDebits(debitsData);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isClient, user]);

  // Initialize user data and load data when user changes
  useEffect(() => {
    const handleUserData = async () => {
      if (user && auth && isClient) {
        console.log('User authenticated, loading data...');
        await loadData();
      } else {
        console.log('User not authenticated or client not ready, clearing data...');
        // Clear data when user logs out
        setBudgets([]);
        setCredits([]);
        setDebits([]);
        setSummary(null);
        setLoading(false);
      }
    };

    handleUserData();
  }, [user, isClient]); // Removed loadData to prevent circular dependency

  // Budget operations
  const createBudget = async (budget: Omit<Budget, 'id' | 'budgetReached' | 'createdAt' | 'isActive' | 'spent'>) => {
    if (!user || !auth) throw new Error('No user logged in');
    try {
      await addBudget(budget);
      await loadData();
    } catch (err: any) {
      console.error('Error creating budget:', err);
      setError(err.message);
      throw err;
    }
  };

  const modifyBudget = async (budgetId: string, updates: Partial<Budget>) => {
    if (!user || !auth) throw new Error('No user logged in');
    try {
      await updateBudget(budgetId, updates);
      await loadData();
    } catch (err: any) {
      console.error('Error modifying budget:', err);
      setError(err.message);
      throw err;
    }
  };

  const removeBudget = async (budgetId: string) => {
    if (!user || !auth) throw new Error('No user logged in');
    try {
      await deleteBudget(budgetId);
      await loadData();
    } catch (err: any) {
      console.error('Error removing budget:', err);
      setError(err.message);
      throw err;
    }
  };

  // Transaction operations
  const createTransaction = async (
    transaction: Omit<Transaction, 'id'> | Omit<Transaction, 'id' | 'timestamp'>,
    type: 'credit' | 'debit'
  ) => {
    if (!user || !auth) throw new Error('No user logged in');
    try {
      await addTransaction(transaction, type);
      await loadData();
    } catch (err: any) {
      console.error('Error creating transaction:', err);
      setError(err.message);
      throw err;
    }
  };

  const modifyTransaction = async (
    transactionId: string,
    type: 'credit' | 'debit',
    updates: Partial<Transaction>
  ) => {
    if (!user || !auth) throw new Error('No user logged in');
    try {
      await updateTransaction(transactionId, type, updates);
      await loadData();
    } catch (err: any) {
      console.error('Error modifying transaction:', err);
      setError(err.message);
      throw err;
    }
  };

  const removeTransaction = async (transactionId: string, type: 'credit' | 'debit') => {
    if (!user || !auth) throw new Error('No user logged in');
    try {
      await deleteTransaction(transactionId, type);
      await loadData();
    } catch (err: any) {
      console.error('Error removing transaction:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    loading,
    error,
    summary,
    budgets,
    credits,
    debits,
    createBudget,
    modifyBudget,
    removeBudget,
    createTransaction,
    modifyTransaction,
    removeTransaction,
    refresh: loadData
  };
};