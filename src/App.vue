<template>
  <div class="dashboard">
    <header class="header">
      <div class="header-left">
        <span class="logo">PiTV</span>
      </div>
      <div class="header-right">
        <span class="clock">{{ time }}</span>
      </div>
    </header>

    <main class="grid-wrapper">
      <section class="section">
        <h2 class="section-title">Streaming</h2>
        <div class="grid">
          <ServiceTile v-for="s in services" :key="s.name" :service="s" />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ServiceTile from './components/ServiceTile.vue'

const services = [
  {
    name: 'Netflix',
    url: 'https://www.netflix.com',
    color: '#e50914',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com',
    color: '#ff0000',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
  },
  {
    name: 'Disney+',
    url: 'https://www.disneyplus.com',
    color: '#0063e5',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
  },
  {
    name: 'Spotify',
    url: 'https://open.spotify.com',
    color: '#1db954',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
  },
  {
    name: 'HBO Max',
    url: 'https://www.max.com',
    color: '#a855f7',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg',
  },
]

const time = ref('')
let timer

function updateTime() {
  const now = new Date()
  time.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 10000)
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0d0d0d 70%);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 56px 0;
  flex-shrink: 0;
}

.logo {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #fff;
}

.clock {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-muted);
}

.grid-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 56px 60px;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
}

@media (max-width: 1280px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
