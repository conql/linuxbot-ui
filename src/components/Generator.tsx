import { Index, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { useThrottleFn } from 'solidjs-use'
import { generateSignature } from '@/utils/auth'
import IconClear from './icons/Clear'
import IconUpload from './icons/Upload'
import MessageItem from './MessageItem'
import ErrorMessageItem from './ErrorMessageItem'
import UploadItem from './UploadItem'
import type { Attachment, ChatMessage, ErrorMessage } from '@/types'

export default () => {
  let inputRef: HTMLTextAreaElement
  const [currentSystemRoleSettings, setCurrentSystemRoleSettings] = createSignal('')
  const [messageList, setMessageList] = createSignal<ChatMessage[]>([])
  const [currentError, setCurrentError] = createSignal<ErrorMessage>()
  const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [controller, setController] = createSignal<AbortController>(null)
  const [isStick, setStick] = createSignal(false)
  const [uploads, setUploads] = createSignal<Attachment[]>([])

  createEffect(() => (isStick() && smoothToBottom()))

  onMount(() => {
    let lastPostion = window.scrollY

    window.addEventListener('scroll', () => {
      const nowPostion = window.scrollY
      nowPostion < lastPostion && setStick(false)
      lastPostion = nowPostion
    })

    try {
      if (sessionStorage.getItem('messageList'))
        setMessageList(JSON.parse(sessionStorage.getItem('messageList')))

      if (sessionStorage.getItem('systemRoleSettings'))
        setCurrentSystemRoleSettings(sessionStorage.getItem('systemRoleSettings'))

      if (localStorage.getItem('stickToBottom') === 'stick')
        setStick(true)
    } catch (err) {
      console.error(err)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    onCleanup(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    })
  })

  const handleBeforeUnload = () => {
    sessionStorage.setItem('messageList', JSON.stringify(messageList()))
    sessionStorage.setItem('systemRoleSettings', currentSystemRoleSettings())
    isStick() ? localStorage.setItem('stickToBottom', 'stick') : localStorage.removeItem('stickToBottom')
  }

  const sendBtnClick = async() => {
    const inputValue = inputRef.value
    if (!inputValue)
      return

    inputRef.value = ''
    setMessageList([
      ...messageList(),
      {
        role: 'user',
        content: inputValue,
      },
    ])
    requestWithLatestMessage()
    instantToBottom()
  }

  const smoothToBottom = useThrottleFn(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }, 300, false, true)

  const instantToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
  }

  const requestWithLatestMessage = async() => {
    setLoading(true)
    setCurrentAssistantMessage('')
    setCurrentError(null)
    const storagePassword = localStorage.getItem('pass')
    try {
      const controller = new AbortController()
      setController(controller)
      const requestMessageList = [...messageList()]
      if (currentSystemRoleSettings()) {
        requestMessageList.unshift({
          role: 'system',
          content: currentSystemRoleSettings(),
        })
      }
      const timestamp = Date.now()
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          messages: requestMessageList,
          time: timestamp,
          pass: storagePassword,
          sign: await generateSignature({
            t: timestamp,
            m: requestMessageList?.[requestMessageList.length - 1]?.content || '',
          }),
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const error = await response.json()
        console.error(error.error)
        setCurrentError(error.error)
        throw new Error('Request failed')
      }
      const data = response.body
      if (!data)
        throw new Error('No data')

      const reader = data.getReader()
      const decoder = new TextDecoder('utf-8')
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        if (value) {
          const char = decoder.decode(value)
          if (char === '\n' && currentAssistantMessage().endsWith('\n'))
            continue

          if (char)
            setCurrentAssistantMessage(currentAssistantMessage() + char)

          isStick() && instantToBottom()
        }
        done = readerDone
      }
    } catch (e) {
      console.error(e)
      setLoading(false)
      setController(null)
      return
    }
    archiveCurrentMessage()
    isStick() && instantToBottom()
  }

  const archiveCurrentMessage = () => {
    if (currentAssistantMessage()) {
      setMessageList([
        ...messageList(),
        {
          role: 'assistant',
          content: currentAssistantMessage(),
        },
      ])
      setCurrentAssistantMessage('')
      setLoading(false)
      setController(null)
      // Disable auto-focus on touch devices
      if (!('ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0))
        inputRef.focus()
    }
  }

  const clearMessages = () => {
    inputRef.value = ''
    inputRef.style.height = 'auto'
    setMessageList([])
    setCurrentAssistantMessage('')
    setCurrentError(null)
  }

  const stopStreamFetch = () => {
    if (controller()) {
      controller().abort()
      archiveCurrentMessage()
    }
  }

  const retryLastFetch = () => {
    if (messageList().length > 0) {
      const lastMessage = messageList()[messageList().length - 1]
      if (lastMessage.role === 'assistant')
        setMessageList(messageList().slice(0, -1))
      requestWithLatestMessage()
    }
  }

  const handleEnterKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || e.shiftKey)
      return

    if (e.keyCode === 13) {
      e.preventDefault()
      sendBtnClick()
    }
  }

  const mapMimeTypeToAttachmentType = (mimeType: string): 'image' | 'file' | 'text' | 'pdf' => {
    if (mimeType.startsWith('image/'))
      return 'image'
    else if (mimeType.startsWith('text/'))
      return 'text'
    else if (mimeType === 'application/pdf')
      return 'pdf'
    else
      return 'file'
  }

  const uploadBtnClick = async() => {
    // Create an input element dynamically
    const input = document.createElement('input')
    input.type = 'file'

    // Listen for changes in the input's value
    input.onchange = async(e) => {
      const file = (e.target as HTMLInputElement).files[0]

      // Create a new attachment with an initial progress of 0
      const newAttachment: Attachment = {
        title: file.name,
        content: '', // Content will be updated after the upload
        type: mapMimeTypeToAttachmentType(file.type),
        progress: 0,
      }

      // Add the new attachment to the uploads signal
      setUploads(prevUploads => [...prevUploads, newAttachment])

      // Create a new XMLHttpRequest
      const xhr = new XMLHttpRequest()

      // Listen for the progress event
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // Calculate the progress as a percentage
          const progress = Math.round((event.loaded / event.total) * 100)

          // Update the progress of the current upload
          setUploads(prevUploads =>
            prevUploads.map(upload =>
              upload.title === file.name ? { ...upload, progress } : upload,
            ),
          )
        }
      }

      // Listen for the load event
      xhr.onload = async() => {
        if (xhr.status === 200) {
          // Parse the response
          const data = JSON.parse(xhr.response)

          // Update the content of the current upload
          setUploads(prevUploads =>
            prevUploads.map(upload =>
              upload.title === file.name
                ? { ...upload, content: `/api/upload?id=${data.id}` }
                : upload,
            ),
          )
        } else {
          // Handle the error
          console.error('File upload failed:', xhr.statusText)
        }
      }

      // Open and send the request
      xhr.open('PUT', '/api/upload', true)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    }

    // Programmatically click the input element to open the file dialog
    input.click()
  }

  return (
    <div my-6>
      <Index each={messageList()}>
        {(message, index) => (
          <MessageItem
            role={message().role}
            message={message().content}
            showRetry={() => (message().role === 'assistant' && index === messageList().length - 1)}
            onRetry={retryLastFetch}
          />
        )}
      </Index>
      {currentAssistantMessage() && (
        <MessageItem
          role="assistant"
          message={currentAssistantMessage}
        />
      )}
      { currentError() && <ErrorMessageItem data={currentError()} onRetry={retryLastFetch} /> }
      <Show
        when={!loading()}
        fallback={
          <div class="gen-cb-wrapper">
            <span>AI 思考中...</span>
            <div class="gen-cb-stop" onClick={stopStreamFetch}>停止</div>
          </div>
        }
      >
        <div class="gen-text-wrapper">
          <button title="上传附件" gen-slate-btn onClick={uploadBtnClick}>
            <IconUpload />
          </button>
          <textarea
            ref={inputRef!}
            onKeyDown={handleEnterKeyDown}
            placeholder="请输入..."
            autocomplete="off"
            autofocus
            onInput={() => {
              inputRef.style.height = 'auto'
              inputRef.style.height = `${inputRef.scrollHeight}px`
            }}
            rows="1"
            class="gen-textarea"
          />
          <button onClick={sendBtnClick} gen-slate-btn>
            发送
          </button>
          <button title="清空" onClick={clearMessages} gen-slate-btn>
            <IconClear />
          </button>
        </div>
        <Show
          when={typeof uploads === 'function' && uploads().length > 0}
        >
          <div class="flex-inline flex-wrap justify-start bg-(slate op-3) rounded-lg p-4 max-w-auto">
            <Index each={uploads()}>
              {(upload, index) => (
                <UploadItem
                  index={index}
                  title={() => upload().title}
                  content={() => upload().content}
                  type={() => upload().type}
                  progress={() => upload().progress}
                  deleteFunc={(index) => {
                    setUploads(uploads().filter((_, i) => i !== index))
                  }}
                />
              )}
            </Index>
            <div class="flex-auto" />
          </div>
        </Show>
      </Show>
      <div class="fixed bottom-5 left-5 rounded-md hover:bg-slate/10 w-fit h-fit transition-colors active:scale-90" class:stick-btn-on={isStick()}>
        <div>
          <div class="p-2.5 text-base" title="黏附底端" onClick={() => setStick(!isStick())}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-list-end"
            ><path d="M16 12H3" /><path d="M16 6H3" /><path d="M10 18H3" /><path d="M21 6v10a2 2 0 0 1-2 2h-5" /><path d="m16 16-2 2 2 2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
