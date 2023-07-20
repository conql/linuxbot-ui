import { Match, Switch, createSignal } from 'solid-js'
import type { Attachment } from '@/types'

export default ({ title, content, type }: Attachment) => {
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
          <Switch
            fallback={
              <div>
                <div class="font-medium">类型： <span class="font-normal">{type}</span></div>
                <div class="font-medium mt-2">内容： <span class="font-normal">{content}</span></div>
              </div>
          }
          >
            <Match when={type === 'image'}>
              <img src={content} alt={title} />
            </Match>
            <Match when={type === 'text' || type === 'knowledge'}>
              <div class="font-medium"><span class="font-normal">{content}</span></div>
            </Match>
          </Switch>
        </div>
      )}
    </div>
  )
}
