import React from 'react';
import { Tabs } from 'antd';
import { ReactComponent as LibraryIcon } from '../../assets/images/libraryIcon.svg';
import { ReactComponent as VideoIcon } from '../../assets/images/videoIcon.svg';
import { ReactComponent as NotationIcon } from '../../assets/images/notationIcon.svg';
import { ReactComponent as ConvertIcon } from '../../assets/images/convertIcon.svg';
import LibraryComp from './library/LibraryComp';
import VideosComp from './videos/VideosComp';
import ConvertNotesComp from './convert-notes/ConvertNotesComp';

export default function MainTabs() {
  // const [pos, setPos] = useState('top');
  // const widthVal = window.innerWidth;

  // useEffect(() => {
  //   if (widthVal <= 768) {
  //     setPos('left');
  //   }
  // }, [widthVal]);

  const items = [
    {
      key: '1',
      label: (
        <div className="tab-icon-wrapper">
          <ConvertIcon className="tab-icons" /> Convert Instrument Notes
        </div>
      ),
      children: <ConvertNotesComp />,
    },
    {
      key: '2',
      label: (
        <div className="tab-icon-wrapper">
          <LibraryIcon className="tab-icons" /> Library
        </div>
      ),
      children: <LibraryComp />,
    },
    {
      key: '3',
      label: (
        <div className="tab-icon-wrapper">
          <VideoIcon className="tab-icons" /> Videos
        </div>
      ),
      children: <VideosComp />,
    },
    {
      key: '4',
      label: (
        <div className="tab-icon-wrapper">
          <NotationIcon className="tab-icons" /> Instrument Notations
        </div>
      ),
      children: <h4>Work In Progress</h4>,
    },
  ];

  const onChange = key => {
    console.log(key);
  };

  return (
    <>
      <div className="main-tab">
        <Tabs defaultActiveKey="1" items={items} onChange={onChange} className="main-tab-content" />
      </div>
    </>
  );
}
