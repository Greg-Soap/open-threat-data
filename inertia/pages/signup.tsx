import { Head, Link, router } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { toast } from 'sonner'
import { PublicLayout } from '@/components/layouts/public'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { type ServerErrorResponse, serverErrorResponder } from '@/lib/error'
import api from '@/lib/http'

interface SignupValues {
  fullName: string
  email: string
  password: string
}

export default function SignUp() {
  const { mutate: signup, isPending } = useMutation({
    mutationFn: (values: SignupValues) => api.post('/auth/signup', values),
    onSuccess: () => {
      toast.success('Account created!', {
        description: 'You can log in now.',
      })
      setTimeout(() => { router.visit('/login') }, 1000)
    },
    onError: (err: ServerErrorResponse) => {
      const error = serverErrorResponder(err)
      toast.error(error || 'Failed to create account. Please try again.')
    },
  })

  const formik = useFormik<SignupValues>({
    initialValues: {
      fullName: '',
      email: '',
      password: '',
    },
    onSubmit: (values) => {
      signup(values)
    },
  })

  return (
    <PublicLayout showFooter={false}>
      <Head title='Sign Up' />
      <div className='max-w-screen-xl mx-auto px-6 py-12 flex items-start justify-center'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle className='text-2xl'>Create Account</CardTitle>
            <CardDescription>Enter your information to create a new account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={formik.handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='fullName'>Full Name</Label>
                <Input
                  id='fullName'
                  name='fullName'
                  type='text'
                  value={formik.values.fullName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  placeholder='John Doe'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  placeholder='you@example.com'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='password'>Password</Label>
                <Input
                  id='password'
                  name='password'
                  type='password'
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  placeholder='••••••••'
                />
              </div>

              <Button type='submit' className='w-full' isLoading={isPending} loadingText='Creating account…'>
                Sign Up
              </Button>

              <div className='text-center text-sm text-muted-foreground'>
                Already have an account?{' '}
                <Link href='/login' className='text-primary hover:underline'>
                  Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  )
}
