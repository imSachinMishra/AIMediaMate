import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

// Register form schema - based on insertUserSchema
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Please confirm your password"),
  agreeTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  
  // If user is already logged in, redirect to home
  if (user) {
    return <Redirect to="/" />;
  }
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });
  
  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false,
    },
  });
  
  // Handle login submit
  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate({
      username: values.username,
      password: values.password,
    });
  };
  
  // Handle register submit
  const onRegisterSubmit = (values: RegisterFormValues) => {
    // Remove confirmPassword and agreeTerms before sending to API
    const { confirmPassword, agreeTerms, ...registerData } = values;
    registerMutation.mutate(registerData);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 animate-fadeIn bg-[#0f1535]">
      <Card className="max-w-md w-full space-y-8 p-8 bg-[rgba(26,32,55,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.05)]">
        {isLoginView ? (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-[#A0AEC0] mb-8">Enter your username and password to sign in</p>
            </div>
            
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#A0AEC0]">Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Username"
                          className="bg-[rgba(45,55,72,0.5)] border-[rgba(160,174,192,0.2)] text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#A0AEC0]">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Min. 8 characters"
                          className="bg-[rgba(45,55,72,0.5)] border-[rgba(160,174,192,0.2)] text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-between">
                  <FormField
                    control={loginForm.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="accent-primary"
                          />
                        </FormControl>
                        <FormLabel className="text-sm text-[#A0AEC0] cursor-pointer">
                          Remember me
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <a href="#" className="text-primary hover:text-blue-400 text-sm font-medium">
                    Forgot password?
                  </a>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Sign in
                </Button>
                
                <div className="text-center mt-4 text-sm">
                  <span className="text-[#A0AEC0]">Don't have an account?</span>
                  <button
                    type="button"
                    onClick={() => setIsLoginView(false)}
                    className="text-primary hover:text-blue-400 font-medium ml-1"
                  >
                    Sign up
                  </button>
                </div>
              </form>
            </Form>
          </>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
              <p className="text-[#A0AEC0] mb-8">Enter your details to register</p>
            </div>
            
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={registerForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#A0AEC0]">First Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John"
                            className="bg-[rgba(45,55,72,0.5)] border-[rgba(160,174,192,0.2)] text-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#A0AEC0]">Last Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Doe"
                            className="bg-[rgba(45,55,72,0.5)] border-[rgba(160,174,192,0.2)] text-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#A0AEC0]">Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="johndoe"
                          className="bg-[rgba(45,55,72,0.5)] border-[rgba(160,174,192,0.2)] text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#A0AEC0]">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          className="bg-[rgba(45,55,72,0.5)] border-[rgba(160,174,192,0.2)] text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#A0AEC0]">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Min. 8 characters"
                          className="bg-[rgba(45,55,72,0.5)] border-[rgba(160,174,192,0.2)] text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#A0AEC0]">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your password"
                          className="bg-[rgba(45,55,72,0.5)] border-[rgba(160,174,192,0.2)] text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="agreeTerms"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="accent-primary mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm text-[#A0AEC0]">
                          I agree to the{" "}
                          <a href="#" className="text-primary hover:text-blue-400">
                            Terms and Conditions
                          </a>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Sign up
                </Button>
                
                <div className="text-center mt-4 text-sm">
                  <span className="text-[#A0AEC0]">Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => setIsLoginView(true)}
                    className="text-primary hover:text-blue-400 font-medium ml-1"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
