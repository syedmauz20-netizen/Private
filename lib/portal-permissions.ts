export function canAccessTask(actor:{admin:boolean;memberId:string},task:{assigneeId:string}){return actor.admin||actor.memberId===task.assigneeId}
export function canSetTaskStatus(admin:boolean,current:string,next:string){if(!['todo','in_progress','review','completed'].includes(next))return false;return admin||(current!=='completed'&&next!=='completed')}
