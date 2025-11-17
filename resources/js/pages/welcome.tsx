import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface WelcomeProps {
    canRegister: boolean;
}

export default function Welcome({ canRegister }: WelcomeProps) {
    return (
        <>
            <Head title="Bem-vindo" />

            <div className="min-h-screen bg-gradient-to-b from-[#FBEEF0] to-white dark:from-gray-900 dark:to-gray-950">
                <header className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#979B80] transition-transform hover:scale-110">
                                <Shield className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold">
                                FallDetector
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="transition-colors hover:bg-[#BAD4D0]/20"
                                    >
                                        Sobre
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl">
                                            Sobre o FallDetector
                                        </DialogTitle>
                                        <DialogDescription className="space-y-4 pt-4 text-base">
                                            <div className="flex items-center justify-center pb-4">
                                                <img
                                                    src="/images/ufcspa-logo.png"
                                                    alt="UFCSPA"
                                                    className="h-20 object-contain"
                                                />
                                            </div>

                                            <p className="text-foreground">
                                                <strong>FallDetector</strong> é
                                                um sistema inteligente de
                                                detecção de quedas desenvolvido
                                                para proteger idosos através de
                                                monitoramento contínuo por vídeo
                                                com inteligência artificial.
                                            </p>

                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-foreground">
                                                    Como funciona:
                                                </h4>
                                                <ul className="list-inside list-disc space-y-1 text-sm">
                                                    <li>
                                                        Monitoramento em tempo
                                                        real via câmera (webcam,
                                                        IP ou RTSP)
                                                    </li>
                                                    <li>
                                                        Detecção automática de
                                                        quedas por IA
                                                    </li>
                                                    <li>
                                                        Alertas instantâneos com
                                                        notificações push
                                                    </li>
                                                    <li>
                                                        Histórico completo de
                                                        eventos
                                                    </li>
                                                    <li>
                                                        Privacidade garantida
                                                        com processamento local
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="space-y-2 border-t pt-4">
                                                <h4 className="font-semibold text-foreground">
                                                    Projeto Acadêmico
                                                </h4>
                                                <p className="text-sm">
                                                    <strong>
                                                        Universidade Federal de
                                                        Ciências da Saúde de
                                                        Porto Alegre (UFCSPA)
                                                    </strong>
                                                </p>
                                                <p className="text-sm">
                                                    Disciplina: Interface
                                                    Homem-Máquina
                                                </p>
                                                <p className="text-sm">
                                                    Desenvolvido por:{' '}
                                                    <strong>
                                                        Caio Foti Pontes
                                                    </strong>{' '}
                                                    e{' '}
                                                    <strong>
                                                        Victor Octavio Rodrigues
                                                        Alves
                                                    </strong>
                                                </p>
                                            </div>
                                        </DialogDescription>
                                    </DialogHeader>
                                </DialogContent>
                            </Dialog>

                            <Link href="/login">
                                <Button
                                    variant="ghost"
                                    className="transition-colors hover:bg-[#BAD4D0]/20"
                                >
                                    Entrar
                                </Button>
                            </Link>
                            {canRegister && (
                                <Link href="/register">
                                    <Button className="transition-transform hover:scale-105">
                                        Começar
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-12 md:py-20">
                    <div className="mx-auto max-w-5xl">
                        <div className="grid items-center gap-12 lg:grid-cols-2">
                            <div className="order-2 space-y-8 lg:order-1">
                                <div className="space-y-4">
                                    <h1 className="text-4xl leading-tight font-bold tracking-tight md:text-5xl lg:text-6xl">
                                        Proteja seus entes queridos com{' '}
                                        <span className="text-[#979B80]">
                                            detecção inteligente
                                        </span>{' '}
                                        de quedas
                                    </h1>
                                    <p className="text-lg text-muted-foreground md:text-xl">
                                        Monitore cuidados com idosos através de
                                        detecção de quedas em tempo real. Receba
                                        alertas instantâneos quando mais
                                        importa.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4 sm:flex-row">
                                    {canRegister && (
                                        <Link href="/register">
                                            <Button
                                                size="lg"
                                                className="group w-full transition-transform hover:scale-105 sm:w-auto"
                                            >
                                                Começar Gratuitamente
                                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                            </Button>
                                        </Link>
                                    )}
                                    <Link href="/login">
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="w-full transition-colors hover:bg-[#BAD4D0]/10 sm:w-auto"
                                        >
                                            Acessar Conta
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            <div className="group relative">
                                <img
                                    src="/images/hero.jpg"
                                    alt="FallDetector"
                                    className="relative w-full max-w-lg transform rounded-2xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                                />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
