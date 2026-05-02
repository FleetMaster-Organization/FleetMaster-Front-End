<script setup>
</script>

<template>
    <div
        class="min-h-screen flex items-center justify-center relative overflow-hidden"
        style="background-color: #e8eaed;"
    >

        <!-- 🔵 FONDOS DIFUMINADOS (más sutiles sobre gris) -->
        <div class="absolute inset-0 z-0 pointer-events-none">
        <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-300 opacity-10 blur-[140px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600 opacity-10 blur-[140px]"></div>
        </div>

        <!-- 🧱 CONTENIDO (LOGIN) -->
        <main class="relative z-10 w-full max-w-120 px-6">
        <slot />
        </main>

        <!-- 🚚 IMAGEN LATERAL -->
        <div class="hidden lg:block absolute right-0 top-0 bottom-0 w-[30%] h-full">
        <div class="w-full h-full relative">

            <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-CTLd2q5A7Fl7GsOjo4tDphZ_im1R3e7zMbiCueUa6Cn8-PHMD4WTRTldO8dm6J0WTCxm5jsx5LEZUzfxvBQqbbvLnrSDzO2HRIp5KY9OYiWVKqcNtEKvujtOKgGD3eVjHPulVmbPa9f9VoMdTUSD28CjnkMP7G3TQgu-c28X06W-3vvfJ1IQ6DPptGYk8Ea1UgH0f_1Sd7_KLBPRW0Iq2J77nPQJDddcAnrSA_AI0o6Lsnejw4Vej2riI1y6VhTWqOA0GrRAO2Cr"
            class="w-full h-full object-cover grayscale opacity-15 contrast-125"
            alt="Flota de transporte"
            />

            <!-- 🔥 OVERLAY DEGRADADO -->
            <div class="absolute inset-0" style="background: linear-gradient(to left, transparent, #e8eaed);"></div>

        </div>
        </div>

    </div>
</template>