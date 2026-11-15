import type {Metadata} from 'next';
import Marketing from '../marketing';
import {pageMetadata} from '../../lib/site-metadata';
export const metadata:Metadata=pageMetadata('story','/cerita');
export default function StoryPage(){return <Marketing/>}
