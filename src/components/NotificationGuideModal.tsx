"use client";
import { useModalContext } from "./modalContext";
// import { pamexColor } from "@/styles/color";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`browser-tabpanel-${index}`}
      aria-labelledby={`browser-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface NotificationGuideModalProps {
  open: boolean;
  onClose: () => void;
}

const NotificationGuideModal = ({
  open,
  onClose,
}: NotificationGuideModalProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [browserType, setBrowserType] = useState("chrome");
  const [isPWA, setIsPWA] = useState(false);
  const { openModal, closeModal } = useModalContext();

  // 使用 ModalContext 管理模態框狀態
  useEffect(() => {
    if (open) {
      openModal();
    } else {
      closeModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  // 檢測瀏覽器類型和 PWA 狀態
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 檢測是否為 PWA 模式
      console.log(navigator.userAgent);
      const isPWAMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsPWA(isPWAMode);

      // 如果是 PWA 模式，默認顯示 PWA 標籤頁
      if (isPWAMode) {
        setTabValue(0);
        return;
      }

      // 否則檢測瀏覽器類型
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.indexOf("edge") > -1) {
        setBrowserType("edge");
        setTabValue(4);
      } else if (userAgent.indexOf("firefox") > -1) {
        setBrowserType("firefox");
        setTabValue(2);
      } else if (
        userAgent.indexOf("safari") > -1 &&
        userAgent.indexOf("chrome") === -1
      ) {
        setBrowserType("safari");
        setTabValue(3);
      } else {
        // 默認為 Chrome 或基於 Chromium 的瀏覽器
        setBrowserType("chrome");
        setTabValue(1);
      }
    }
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 根據設備類型顯示不同的 PWA 指南
  const renderPWAGuide = () => {
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

    return (
      <Box
        sx={{
          mb: 2,
         
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ color: "#ffffff" }}>
          Enable Notifications for PWA App
        </Typography>
        <Typography variant="body1" paragraph>
          {`If you've installed our app to your home screen, you can enable
          notifications through your device settings:`}
        </Typography>
        {isIOS ? (
          // iOS 設備指南
          (<Box
            sx={{
              mb: 2,
              "& .MuiBox-root": {
                padding: "10px 10px",
              },
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              gutterBottom
              sx={{ color: "#3185ff" }}
            >
              For iOS devices:
            </Typography>
            <ol>
              <li>
                <Typography paragraph>1 . Go to your device Settings</Typography>
              </li>
              <li>
                <Typography paragraph>
                  2 . Scroll down and tap on our app name
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`3 . Find "Notifications" and tap on it`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`4 . Toggle "Allow Notifications" to enable them`}
                </Typography>
              </li>
            </ol>
          </Box>)
        ) : (
          // Android 設備指南
          (<Box sx={{ mt: 3, mb: 2 }}>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              gutterBottom
              sx={{ color: "#3185ff" }}
            >
              For Android devices:
            </Typography>
            <ol>
              <li>
                <Typography paragraph>1 . Go to your device Settings</Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`2 . Tap on "Apps" or "Applications"`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>3 . Find and tap on our app</Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`4 . Tap on "Permissions" or "Notifications"`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  5 . Enable notifications for the app
                </Typography>
              </li>
            </ol>
          </Box>)
        )}
        <Typography variant="body2" color="grey" sx={{ mt: 2 }}>
          Note: After enabling notifications in your device settings, you may
          need to restart the app for the changes to take effect.
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "4px",
          bgcolor: "#333333",
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", pb: 2 }}
      >
        <Typography
          variant="h6"
          component="h2"
          fontWeight="bold"
          sx={{ color: "#ffffff" }}
        >
          How to Enable Notifications
        </Typography>
        <Typography
          component="p"
          variant="subtitle1"
          color="rgba(255, 255, 255, 0.7)"
        >
          Please follow these steps to enable notifications
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          bgcolor: "#333333",
          color: "#ffffff",
          padding: "10px 10px",
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="browser tabs"
          sx={{
            mb: 2,
            mt: 2,
            borderBottom: 1,
            borderColor: "rgba(255, 255, 255, 0.1)",
            "& .MuiTabs-indicator": {
              backgroundColor: "#3185ff",
              color: "#3185ff",
            },
            "& .MuiTab-root": {
              color: "rgba(255, 255, 255, 0.7)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: "bold",
              },
            },
          }}
        >
          <Tab label="PWA App" />
          <Tab label="Chrome" />
          <Tab label="Firefox" />
          <Tab label="Safari" />
          <Tab label="Edge" />
        </Tabs>

        {/* PWA App 指南 */}
        <TabPanel value={tabValue} index={0}>
          {renderPWAGuide()}
        </TabPanel>

        {/* Chrome 指南 */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: "#ffffff" }}>
              Enable Notifications in Chrome
            </Typography>
            <Typography variant="body1" paragraph>
              please follow the steps below:
            </Typography>
            <ol>
              <li>
                <Typography paragraph>
                  1 . Click on the lock icon 🔒 in the address bar
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`2 . Find "Notifications" or "Site Settings" in the popup menu`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`3 . Change the notification setting from "Block" to "Allow"`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  4 . Refresh the page to apply the new settings
                </Typography>
              </li>
            </ol>
          </Box>
        </TabPanel>

        {/* Firefox 指南 */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: "#ffffff" }}>
              Enable Notifications in Firefox
            </Typography>
            <Typography variant="body1" paragraph>
              please follow the steps below:
            </Typography>
            <ol>
              <li>
                <Typography paragraph>
                  1 . Click on the lock icon or info icon (i) in the address bar
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`2 . Find "Notifications" permission settings in the popup menu`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`3 . Change the notification setting from "Block" to "Allow"`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  4 . Refresh the page to apply the new settings
                </Typography>
              </li>
            </ol>
          </Box>
        </TabPanel>

        {/* Safari 指南 */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: "#ffffff" }}>
              Enable Notifications in Safari
            </Typography>
            <Typography variant="body1" paragraph>
              please follow the steps below:
            </Typography>
            <ol>
              <li>
                <Typography paragraph>
                  {`1 . Click on "Safari" in the menu bar and select "Preferences"`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>{`2 . Select the "Websites" tab`}</Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`3 . Select "Notifications" from the left menu`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`4 . Find this website and change the setting from "Deny" to
                  "Allow"`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  5 . Refresh the page to apply the new settings
                </Typography>
              </li>
            </ol>
          </Box>
        </TabPanel>

        {/* Edge 指南 */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: "#ffffff" }}>
              Enable Notifications in Edge
            </Typography>
            <Typography variant="body1" paragraph>
              Please follow these steps:
            </Typography>
            <ol>
              <li>
                <Typography paragraph>
                  Click on the lock icon 🔒 in the address bar
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`Find "Notifications" or "Site permissions" in the popup menu`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  {`Change the notification setting from "Block" to "Allow"`}
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  Refresh the page to apply the new settings
                </Typography>
              </li>
            </ol>
          </Box>
        </TabPanel>

        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: '#000',
            borderRadius: 1,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ color: "#3185ff", fontWeight: "bold" }}
            gutterBottom
          >
            Note :
          </Typography>
          <Typography variant="body2">
            {`If you still cannot receive notifications after enabling them, make
            sure your system notification settings are also turned on and your
            browser is not in "Do Not Disturb" or "Focus" mode.`}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{ px: 3, py: 2, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <Button
          onClick={onClose}
          sx={{
            bgcolor: "#3185ff",
            color: "white",
            "&:hover": {
              bgcolor: "rgba(56, 21, 255, 0.9)",
            },
            px: 4,
          }}
          variant="contained"
        >
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationGuideModal;
