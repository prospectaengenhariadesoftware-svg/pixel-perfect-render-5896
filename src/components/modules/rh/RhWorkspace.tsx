import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant-context";
import { EmployeeManagerEnhanced } from "./EmployeeManagerEnhanced";
import { RhModule } from "./RhModule";

type RefRow={id:string;name:string;status:string;department_id?:string|null;position_id?:string|null};
export function RhWorkspace(){
 const supabase=getSupabase(); const {tenant}=useTenant(); const tenantId=tenant?.id??null;
 const [departments,setDepartments]=useState<RefRow[]>([]),[positions,setPositions]=useState<RefRow[]>([]),[functions,setFunctions]=useState<RefRow[]>([]);
 useEffect(()=>{if(!supabase||!tenantId)return;void (async()=>{const [d,p,f]=await Promise.all([supabase.from("rh_departments").select("id,name,status").eq("tenant_id",tenantId).order("name"),supabase.from("rh_positions").select("id,name,status,department_id").eq("tenant_id",tenantId).order("name"),supabase.from("rh_functions").select("id,name,status,department_id,position_id").eq("tenant_id",tenantId).order("name")]);if(!d.error)setDepartments((d.data??[]) as RefRow[]);if(!p.error)setPositions((p.data??[]) as RefRow[]);if(!f.error)setFunctions((f.data??[]) as RefRow[])})()},[supabase,tenantId]);
 return <div className="space-y-6"><Card className="shadow-card"><CardHeader><CardTitle>Cadastro de Colaboradores</CardTitle></CardHeader><CardContent><EmployeeManagerEnhanced departments={departments} positions={positions} functions={functions}/></CardContent></Card><RhModule/></div>
}
