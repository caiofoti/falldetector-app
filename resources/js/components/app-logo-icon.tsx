import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {/* Simplified icon representing a person with alert/detection symbol */}
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C10.9 2 10 2.9 10 4C10 5.1 10.9 6 12 6C13.1 6 14 5.1 14 4C14 2.9 13.1 2 12 2ZM16 20H8L7 11H9V19H11V14H13V19H15V11H17L16 20ZM12 8C9.8 8 8 9.8 8 12H6C6 8.7 8.7 6 12 6C15.3 6 18 8.7 18 12H16C16 9.8 14.2 8 12 8ZM20 12C20 7.6 16.4 4 12 4V2C17.5 2 22 6.5 22 12H20ZM4 12C4 7.6 7.6 4 12 4V2C6.5 2 2 6.5 2 12H4Z"
            />
        </svg>
    );
}
