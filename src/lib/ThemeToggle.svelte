<script lang="ts">
  import { theme, THEMES, type Theme } from './theme.svelte'

  const labels: Record<Theme, string> = { system: 'Auto', light: 'Light', dark: 'Dark' }
</script>

<div class="theme-toggle" role="group" aria-label="Color theme">
  {#each THEMES as option (option)}
    <button
      type="button"
      aria-pressed={theme.value === option}
      onclick={() => theme.set(option)}
    >
      {labels[option]}
    </button>
  {/each}
</div>

<style>
  .theme-toggle {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 2px;
    background: var(--surface);
  }

  button {
    min-height: var(--tap);
    min-width: var(--tap);
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }

  button:hover {
    color: var(--text-h);
  }

  button[aria-pressed='true'] {
    background: var(--accent-bg);
    color: var(--accent);
    font-weight: 600;
  }

  @media (min-width: 40rem) {
    button {
      min-height: 32px;
    }
  }
</style>
