import { FullLogo } from '@components/logo/FullLogo';
import { css } from '@emotion/react';
import { AuthForms } from '@modules/auth/components/AuthForms';

import Lottie from 'lottie-react';
import { CircleBg } from '@components/decoration/Bubble';
import animation from './sign-in.json';

const s = {
  pageContainer: css`
    width: 100%;
    height: 100vh;
    box-sizing: border-box;
    background: var(--bg-gradient-accent);
    position: relative;
  `,
  contentContainer: css`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 95%;
  `,
  formContainer: css`
    background: #fff;
    padding: 100px 64px 120px;
    max-width: 520px;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    border: 1px solid var(--color-border);
    border-radius: var(--x2);
  `,
  lottieContainer: css`
    position: relative;
    max-width: 520px;
    margin: -70px auto 0;
  `,
  logoContainer: css`
    position: absolute;
    top: var(--x6);
    left: var(--x10);
  `,
};

const Auth = () => {
  return (
    <div css={s.pageContainer}>
      <div css={s.logoContainer}>
        <FullLogo size={26} />
      </div>

      <div css={s.contentContainer}>
        <div css={s.formContainer}>
          <AuthForms />
        </div>
        {/* <div css={s.lottieContainer}>
          <BubbleMain />
          <Lottie animationData={animation} loop={true} />
        </div> */}
      </div>

      <BubbleBottom />
      <BubbleTop />
      <BubbleLeft />
      <BubbleRight />
    </div>
  );
};

// react.lazy
// eslint-disable-next-line import/no-default-export
export default Auth;

const BubbleBottom = () => {
  return (
    <svg
      css={css`
        position: fixed;
        bottom: -10px;
        right: 10%;
      `}
      width="310"
      height="60"
      viewBox="0 0 310 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M154.5 0.5C232.1 0.5 290.167 40.1667 309.5 60H0C19.1667 40.1667 76.9 0.5 154.5 0.5Z"
        fill="#E6E7FF"
      />
    </svg>
  );
};

const BubbleTop = () => {
  return (
    <svg
      css={css`
        position: fixed;
        top: -10px;
        left: 45%;
      `}
      width="185"
      height="46"
      viewBox="0 0 185 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M92.6494 46C46.265 46 11.5563 15.3333 4.02145e-06 -9.14425e-07L185 1.52588e-05C173.543 15.3333 139.034 46 92.6494 46Z"
        fill="#E5EDFF"
      />
    </svg>
  );
};

const BubbleLeft = () => {
  return (
    <svg
      css={css`
        position: fixed;
        left: var(--x8);
        bottom: 20%;
      `}
      width="84"
      height="86"
      viewBox="0 0 84 86"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M32.9125 7.52281L46.8803 14.8683C53.4041 18.3339 55.9113 26.3981 52.489 32.9102L45.1466 46.8798C41.7216 53.3925 33.6572 55.8998 27.1451 52.4776L13.1318 45.1472C6.61972 41.725 4.11449 33.6573 7.52246 27.1026L14.9082 13.1214C18.3306 6.60935 26.4004 4.10063 32.9125 7.52281Z"
        fill="#E6EAFF"
      />
      <path
        d="M67.7797 54.6619L76.0464 59.0092C79.9074 61.0603 81.3912 65.833 79.3658 69.6871L75.0203 77.9548C72.9933 81.8093 68.2204 83.2932 64.3663 81.2678L56.0728 76.9294C52.2187 74.904 50.736 70.1293 52.753 66.2499L57.1241 57.9753C59.1496 54.1213 63.9256 52.6365 67.7797 54.6619Z"
        fill="#ECEFFF"
      />
    </svg>
  );
};

const BubbleRight = () => {
  return (
    <svg
      css={css`
        position: fixed;
        right: 5%;
        top: 5%;
      `}
      width="85"
      height="64"
      viewBox="0 0 85 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M81.4651 33.1264L70.7548 44.7171C65.7188 50.1216 57.2804 50.4562 51.8761 45.4651L40.2828 34.7573C34.8784 29.7633 34.5438 21.3248 39.5349 15.9203L50.2424 4.28179C55.2334 -1.12269 63.6746 -1.45449 69.1239 3.53385L80.7172 14.2866C86.1216 19.2777 86.4562 27.7219 81.4651 33.1264Z"
        fill="#E6EAFF"
      />
      <path
        d="M26.9079 54.6054L20.5692 61.4652C17.5887 64.6638 12.5945 64.8618 9.39603 61.9079L2.53473 55.5706C-0.663781 52.615 -0.861808 47.6208 2.09206 44.4222L8.42917 37.5341C11.383 34.3355 16.3788 34.1392 19.604 37.0915L26.4653 43.4553C29.6638 46.4093 29.8618 51.4068 26.9079 54.6054Z"
        fill="#ECEFFF"
      />
    </svg>
  );
};

const BubbleMain = () => {
  return (
    <CircleBg
      css={css`
        position: absolute;
        left: -110px;
        bottom: -30px;
        z-index: 0;
      `}
    />
  );
};
