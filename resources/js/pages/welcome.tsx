import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import AppLogoIcon from '@/components/app-logo-icon';
import { Shield, Bell, Video, AlertTriangle } from 'lucide-react';

interface WelcomeProps {
    canRegister: boolean;
}

export default function Welcome({ canRegister }: WelcomeProps) {
    return (
        <>
            <Head title="Welcome" />

            <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-950">
                {/* Header */}
                <header className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white">
                                <AppLogoIcon className="h-6 w-6 fill-current" />
                            </div>
                            <span className="text-xl font-bold">FallDetector</span>
                        </div>
                        <div className="flex gap-3">
                            <Link href="/login">
                                <Button variant="ghost">Log in</Button>
                            </Link>
                            {canRegister && (
                                <Link href="/register">
                                    <Button>Get Started</Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <main className="container mx-auto px-4 py-12 md:py-20">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                                Protect Your Loved Ones with{' '}
                                <span className="text-orange-600">AI-Powered</span> Fall Detection
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                                Monitor elderly care with real-time fall detection. Get instant alerts when it matters most.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {canRegister && (
                                <Link href="/register">
                                    <Button size="lg" className="w-full sm:w-auto">
                                        Start Monitoring Free
                                    </Button>
                                </Link>
                            )}
                            <Link href="/login">
                                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                                    Sign In
                                </Button>
                            </Link>
                        </div>

                        {/* Features */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pt-12">
                            <div className="space-y-3 p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                                    <Video className="h-6 w-6 text-orange-600" />
                                </div>
                                <h3 className="font-semibold">24/7 Monitoring</h3>
                                <p className="text-sm text-muted-foreground">
                                    Continuous video analysis with AI-powered fall detection
                                </p>
                            </div>

                            <div className="space-y-3 p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                    <Bell className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="font-semibold">Instant Alerts</h3>
                                <p className="text-sm text-muted-foreground">
                                    Real-time push notifications the moment a fall is detected
                                </p>
                            </div>

                            <div className="space-y-3 p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                    <Shield className="h-6 w-6 text-green-600" />
                                </div>
                                <h3 className="font-semibold">Privacy First</h3>
                                <p className="text-sm text-muted-foreground">
                                    Your video data is secure and processed locally
                                </p>
                            </div>

                            <div className="space-y-3 p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-purple-600" />
                                </div>
                                <h3 className="font-semibold">Alert History</h3>
                                <p className="text-sm text-muted-foreground">
                                    Complete log of all detected falls with timestamps
                                </p>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="container mx-auto px-4 py-8 mt-20 border-t">
                    <div className="text-center text-sm text-muted-foreground">
                        <p>&copy; {new Date().getFullYear()} FallDetector. Keeping your loved ones safe.</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
