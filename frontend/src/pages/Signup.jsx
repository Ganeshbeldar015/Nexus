import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockDb } from '../services/mockDb';
import Input from '../components/Input';
import Button from '../components/Button';
import {
  UserPlus,
  Heart,
  Building2,
  ArrowLeft,
} from 'lucide-react';

const signupSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['donor', 'ngo'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
});

const Signup = () => {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'donor',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    try {
      const user = await signup(data);

      if (user.role === 'ngo') {
        mockDb.addNgo({
          id: user.id,
          name: data.full_name,
          email: data.email,
        });

        navigate(`/manage-ngo/${user.id}`);
      } else {
        navigate(`/${user.role}-dashboard`);
      }
    } catch (error) {
      console.error('Signup failed', error);
    }
  };

  const roles = [
    {
      id: 'donor',
      name: 'Donor',
      icon: Heart,
      description: 'I want to help',
    },
    {
      id: 'ngo',
      name: 'NGO',
      icon: Building2,
      description: 'I want to fundraise',
    },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-zinc-50">

      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 h-12 w-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition"
      >
        <ArrowLeft size={24} className="text-black" />
      </button>

      {/* Signup Card */}
      <div className="max-w-xl w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-zinc-100">

        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-zinc-100 text-black flex items-center justify-center rounded-2xl mb-4">
            <UserPlus size={28} />
          </div>

          <h2 className="text-3xl font-bold text-slate-900">
            Create Account
          </h2>

          <p className="mt-2 text-slate-500">
            Join our transparent donation network
          </p>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-4">

            <Input
              label="Full Name"
              placeholder="John Doe"
              {...register('full_name')}
              error={errors.full_name?.message}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
            />

            {/* Role Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 ml-1">
                Select Your Role
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setValue('role', role.id)}
                    className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                      selectedRole === role.id
                        ? 'border-black bg-zinc-50 text-black ring-2 ring-black/10'
                        : 'border-zinc-100 hover:border-zinc-200 text-slate-500'
                    }`}
                  >
                    <role.icon className="mb-2" size={24} />

                    <span className="font-bold text-sm">
                      {role.name}
                    </span>

                    <span className="text-[10px] opacity-70">
                      {role.description}
                    </span>
                  </button>
                ))}

              </div>

              {errors.role && (
                <p className="text-xs font-bold text-black ml-1">
                  {errors.role.message}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={loading}
          >
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}

          <Link
            to="/login"
            className="font-bold text-black hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
