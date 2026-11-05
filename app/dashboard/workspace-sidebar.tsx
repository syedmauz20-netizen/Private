'use client';
import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';

/** Shared keyboard and focus behavior for both workspace drawers. */
export default function WorkspaceSidebar({id,open,onClose,employee=false,children}:{id:string;open:boolean;onClose:()=>void;employee?:boolean;children:React.ReactNode}){
  const sidebar=useRef<HTMLElement>(null);
  useEffect(()=>{
    if(!open||!window.matchMedia('(max-width: 760px)').matches)return;
    const previous=document.activeElement as HTMLElement|null;
    const content=sidebar.current?.parentElement?.querySelector<HTMLElement>('.portal-content');
    const wasInert=content?.hasAttribute('inert');
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';content?.setAttribute('inert','');
    const focusable=()=>Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),summary,select,input,textarea,[tabindex="0"]')||[]).filter(el=>el.getClientRects().length>0);
    sidebar.current?.querySelector<HTMLButtonElement>('.workspace-side-close')?.focus();
    function keydown(e:KeyboardEvent){
      if(e.key==='Escape'){e.preventDefault();onClose();}
      if(e.key==='Tab'){
        const items=focusable(),first=items[0],last=items[items.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    }
    const media=window.matchMedia('(max-width: 760px)');
    const resize=()=>{if(!media.matches)onClose();};
    document.addEventListener('keydown',keydown);media.addEventListener('change',resize);
    return ()=>{document.body.style.overflow=overflow;if(!wasInert)content?.removeAttribute('inert');document.removeEventListener('keydown',keydown);media.removeEventListener('change',resize);previous?.focus();};
  },[open,onClose]);
  return <>
    {open&&<button className="workspace-drawer-backdrop" aria-label="Close workspace navigation" tabIndex={-1} onClick={onClose}/>}
    <aside ref={sidebar} id={id} className={'portal-sidebar '+(employee?'employee-sidebar ':'')+(open?'mobile-open':'')} role={open?'dialog':undefined} aria-modal={open?true:undefined} aria-label={employee?'Employee workspace navigation':'Admin workspace navigation'}>
      <button className="workspace-side-close" aria-label="Close workspace menu" onClick={onClose}><X size={20}/></button>
      {children}
    </aside>
  </>;
}
