import { createContext, useContext, useMemo, useReducer, useRef } from 'react'
import { DEFAULT_PERSON, DEFAULT_TEXT } from '../utils/constants'

/*
  Single source of truth for the magazine composition, shared across routes.
  Kept intentionally small and serialisable so it is easy to persist or lift
  into a dedicated store later.
*/

const initialState = {
  // Original upload
  name: '',
  original: null, // { dataUrl }
  file: null, // File — kept in memory for the bg-removal API call

  // After background removal
  person: null, // { dataUrl, aspect, processed }

  // Editable layer transforms (normalised 0..1 within the cover)
  layout: {
    person: { ...DEFAULT_PERSON },
    text: { ...DEFAULT_TEXT, content: '' },
  },

  // Final composited cover
  finalDataUrl: null, // object URL of the exported PNG blob
  finalMeta: null, // { width, height, scale }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_UPLOAD':
      return {
        ...state,
        file: action.file,
        original: { dataUrl: action.dataUrl },
      }
    case 'SET_NAME':
      return {
        ...state,
        name: action.name,
        layout: {
          ...state.layout,
          text: { ...state.layout.text, content: action.name },
        },
      }
    case 'SET_PERSON':
      return {
        ...state,
        person: {
          dataUrl: action.dataUrl,
          aspect: action.aspect,
          processed: action.processed,
        },
      }
    case 'UPDATE_PERSON_LAYER':
      return {
        ...state,
        layout: {
          ...state.layout,
          person: { ...state.layout.person, ...action.patch },
        },
      }
    case 'UPDATE_TEXT_LAYER':
      return {
        ...state,
        layout: {
          ...state.layout,
          text: { ...state.layout.text, ...action.patch },
        },
      }
    case 'SET_FINAL':
      return { ...state, finalDataUrl: action.url, finalMeta: action.meta }
    case 'RESET':
      return { ...initialState, layout: {
        person: { ...DEFAULT_PERSON },
        text: { ...DEFAULT_TEXT, content: '' },
      } }
    default:
      return state
  }
}

const MagazineContext = createContext(null)

export function MagazineProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  // Track the current export object URL so we can revoke it before replacing.
  const finalUrlRef = useRef(null)

  const actions = useMemo(
    () => ({
      setUpload: (file, dataUrl) => dispatch({ type: 'SET_UPLOAD', file, dataUrl }),
      setName: (name) => dispatch({ type: 'SET_NAME', name }),
      setPerson: (dataUrl, aspect, processed) =>
        dispatch({ type: 'SET_PERSON', dataUrl, aspect, processed }),
      updatePersonLayer: (patch) => dispatch({ type: 'UPDATE_PERSON_LAYER', patch }),
      updateTextLayer: (patch) => dispatch({ type: 'UPDATE_TEXT_LAYER', patch }),
      setFinal: (url, meta) => {
        if (finalUrlRef.current && finalUrlRef.current !== url) {
          URL.revokeObjectURL(finalUrlRef.current)
        }
        finalUrlRef.current = url
        dispatch({ type: 'SET_FINAL', url, meta })
      },
      reset: () => {
        if (finalUrlRef.current) {
          URL.revokeObjectURL(finalUrlRef.current)
          finalUrlRef.current = null
        }
        dispatch({ type: 'RESET' })
      },
    }),
    [],
  )

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])

  return <MagazineContext.Provider value={value}>{children}</MagazineContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMagazine() {
  const ctx = useContext(MagazineContext)
  if (!ctx) throw new Error('useMagazine must be used within a MagazineProvider')
  return ctx
}
