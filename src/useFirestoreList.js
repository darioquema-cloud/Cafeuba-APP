import{useEffect,useRef,useState,useCallback}from"react";
import{collection,onSnapshot,doc,setDoc,deleteDoc}from"firebase/firestore";
import{db}from"./firebase";

export function useFirestoreList(collName,seed=[]){
  const[items,_set]=useState(seed);
  const ref=useRef(seed);
  const[ready,setReady]=useState(false);
  const seeded=useRef(false);
  useEffect(()=>{
    const unsub=onSnapshot(collection(db,collName),snap=>{
      const data=snap.docs.map(d=>d.data());
      if(data.length===0&&!seeded.current&&seed.length>0){
        seeded.current=true;
        seed.forEach(item=>setDoc(doc(db,collName,String(item.id)),item));
        ref.current=seed;_set(seed);setReady(true);return;
      }
      if(data.length>0)seeded.current=true;
      ref.current=data;_set(data);setReady(true);
    });
    return unsub;
  },[collName]);
  const setItems=useCallback(updater=>{
    const prev=ref.current;
    const next=typeof updater==="function"?updater(prev):updater;
    const pm=new Map(prev.map(x=>[String(x.id),x]));
    const nm=new Map(next.map(x=>[String(x.id),x]));
    for(const[id]of pm){if(!nm.has(id))deleteDoc(doc(db,collName,id));}
    for(const[id,item]of nm){if(!pm.has(id)||JSON.stringify(pm.get(id))!==JSON.stringify(item))setDoc(doc(db,collName,id),item);}
    ref.current=next;_set(next);
  },[collName]);
  return[items,setItems,ready];
}
