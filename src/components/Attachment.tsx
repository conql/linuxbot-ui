// Attachment.tsx

import { createSignal } from 'solid-js'

interface AttachProps {
  title: string
  content: string
  type: 'image' | 'file' | 'text'
  position: 'before' | 'after'
}

export default ({ title, content, type, position }: AttachProps) => {
  const [expand, setExpand] = createSignal(false)

  const handleExpand = () => {
    setExpand(!expand())
  }

  return (
    <div>
      <div
        onClick={handleExpand}
        class="cursor-pointer hover:underline flex items-center select-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          class={`h-5 w-5 mr-2 transform transition-transform duration-200 ${expand() ? 'rotate-90' : ''}`}
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
        {title}
      </div>
      {expand() && (
        <div class="mt-4 ml-7">
          <div class="font-medium">Type: <span class="font-normal">{type}</span></div>
          <div class="font-medium mt-2">Content: <span class="font-normal">{content}</span></div>
        </div>
      )}
    </div>
  )
}
