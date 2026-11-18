import {useContent} from '../context/ContentContext';
export default function Announcement(){
 const {announcement_bar}=useContent();
 if(!announcement_bar?.enabled||!announcement_bar.text?.trim())return null;
 return <div className="bg-primary-800 px-4 py-2 text-center text-sm font-medium text-white">{announcement_bar.text}</div>;
}
