<template>
  <a
    :href="service.url"
    class="tile"
    :style="{ '--brand': service.color }"
    tabindex="0"
    :aria-label="service.name"
    target="_blank"
    rel="noopener noreferrer"
  >
    <div class="tile-logo">
      <img v-if="service.logo" :src="service.logo" :alt="service.name" />
      <span v-else class="tile-initials">{{ initials }}</span>
    </div>
    <span class="tile-name">{{ service.name }}</span>
  </a>
</template>

<script setup>
const props = defineProps({
  service: {
    type: Object,
    required: true,
  },
})

const initials = props.service.name
  .split(' ')
  .map((w) => w[0])
  .join('')
  .toUpperCase()
  .slice(0, 2)
</script>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: 16px;
  padding: 32px 20px;
  text-decoration: none;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
  outline: none;
  aspect-ratio: 3/2;
}

.tile:hover,
.tile:focus {
  background: var(--surface-hover);
  border-color: var(--brand, #fff);
  transform: scale(1.04);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand, #fff) 40%, transparent);
}

.tile-logo {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
}

.tile-initials {
  font-size: 2rem;
  font-weight: 700;
  color: var(--brand, #fff);
}

.tile-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
  letter-spacing: 0.03em;
}
</style>
