<script module>
  // L2.2 — port of Chat/MessageStatus.jsx. The status→label mapping that was a
  // run of `if` reassignments (MessageStatus.jsx:12-22) becomes a $derived below.
  // ldrs registered once at module scope (mirrors the React module-level call).
  import { dotPulse } from 'ldrs'
  dotPulse.register()
</script>

<script>
  import ProfileImage from './ProfileImage.svelte'

  let { name, role, status } = $props()

  // runStatus → human label (MessageStatus.jsx:11-22). queued→Thinking,
  // requires_action→Searching, in_progress|completed→Typing. Anything else falls
  // through as the raw status, exactly as the React if-chain did.
  const label = $derived(
    status === 'queued'
      ? 'Thinking'
      : status === 'requires_action'
        ? 'Searching'
        : status === 'in_progress' || status === 'completed'
          ? 'Typing'
          : status
  )
</script>

<div
  class="w-full mx-auto mb-6 md:max-w-3xl flex flex-row space-x-3 font-nunito text-base text-primary"
>
  <ProfileImage {role} />
  <div class="flex flex-col w-11/12">
    <div class="h-[28px] flex items-center font-extrabold text-base">
      <span>{name}</span>
    </div>
    <div class="flex flex-row space-x-2 mt-2 mb-10 text-primary items-center">
      <p class="text-base font-extrabold font-nunito">{label}</p>
      <l-dot-pulse size="36" speed="1.4"></l-dot-pulse>
    </div>
  </div>
</div>
