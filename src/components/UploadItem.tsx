import { createEffect, createSignal } from 'solid-js'
import IconPDF from './icons/PDF'

export default ({ index, title, content, type, progress, deleteFunc }) => {
  const [icon, setIcon] = createSignal(null)

  createEffect(() => {
    switch (type()) {
      case 'pdf':
        setIcon(<IconPDF size="2em" />)
        break
      case 'image':
        setIcon(<div><img src={content()} style={{ width: '2em', height: '2em' }} /></div>)
        break
      default:
        setIcon(<div>unknown</div>)
    }
  })

  const handleClick = () => {
    window.open(content())
  }

  const handleDelete = () => {
    deleteFunc(index)
  }

  return (
    <div
      class="inline-flex flex-col items-center justify-center hover:bg-(slate op-10) rounded-lg p-1 select-none relative m-2"
      style={{
        width: '80px',
        height: '80px',
      }}
    >
      <div class="relative" style={{ height: '2em' }}>
        {icon()}
        <div
          class="absolute top-0 left-0 bg-slate op-70"
          style={{
            width: '100%',
            height: `${
              100 - (isNaN(progress()) ? 0 : progress())
            }%`,
          }}
        />
      </div>
      <div
        class="text-xs text-(slate op-70) mt-1 truncate w-full cursor-pointer text-center"
        onClick={handleClick}
      >{title()}
      </div>
      <button
        class="absolute top-0 right-0 m-1 hover:bg-(slate op-20) transition-opacity op-0 hover:op-50 w-7 h-7 justify-center items-center rounded-full flex"
        onClick={handleDelete}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '1em', height: '1em' }}>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
