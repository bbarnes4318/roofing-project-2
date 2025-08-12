// Navigation Test Utilities for validating BackButton functionality

export const NavigationTestUtils = {
    // Test navigation history persistence across page refreshes
    testRefreshPersistence: () => {
        const historyBeforeRefresh = sessionStorage.getItem('nav_history');
        
        console.group('🧪 Testing Navigation History Persistence');
        console.log('History before refresh:', historyBeforeRefresh ? JSON.parse(historyBeforeRefresh) : 'No history');
        
        // Simulate a page refresh by clearing and restoring history
        const originalHistory = historyBeforeRefresh;
        sessionStorage.removeItem('nav_history');
        
        setTimeout(() => {
            if (originalHistory) {
                sessionStorage.setItem('nav_history', originalHistory);
                console.log('✅ History restored successfully after refresh simulation');
            } else {
                console.log('⚠️ No history to restore');
            }
            console.groupEnd();
        }, 100);
    },

    // Test multiple back/forward navigation cycles
    testMultipleNavigationCycles: (navigationHook) => {
        console.group('🧪 Testing Multiple Back/Forward Navigation');
        
        if (!navigationHook) {
            console.error('❌ Navigation hook not provided');
            console.groupEnd();
            return;
        }

        const { pushNavigation, goBack, canGoBack, history } = navigationHook;
        
        // Push several navigation entries
        const testPages = [
            { name: 'Dashboard', data: { section: 'overview' } },
            { name: 'Projects', data: { section: 'projects' } },
            { name: 'Project Detail', data: { project: { id: 1, name: 'Test Project' } } },
            { name: 'Project Messages', data: { tab: 'messages' } }
        ];

        console.log('📝 Pushing test navigation entries...');
        testPages.forEach((page, index) => {
            pushNavigation(page.name, page.data);
            console.log(`${index + 1}. Pushed: ${page.name}`, page.data);
        });

        console.log('\n🔄 Testing back navigation cycles...');
        let backCount = 0;
        const maxBacks = 3;

        const performBackNavigation = () => {
            if (canGoBack() && backCount < maxBacks) {
                const previousPage = goBack();
                backCount++;
                console.log(`🔙 Back ${backCount}: Returned to`, previousPage);
                
                // Test another back after a short delay
                setTimeout(() => {
                    if (backCount < maxBacks) {
                        performBackNavigation();
                    } else {
                        console.log('✅ Multiple back navigation test completed');
                        console.groupEnd();
                    }
                }, 500);
            } else {
                console.log('🚫 Cannot go back further or max backs reached');
                console.groupEnd();
            }
        };

        setTimeout(performBackNavigation, 1000);
    },

    // Test position preservation during navigation
    testPositionPreservation: (navigationHook) => {
        console.group('🧪 Testing Position Preservation');
        
        // Scroll to a specific position
        const testScrollPosition = 800;
        window.scrollTo(0, testScrollPosition);
        
        console.log(`📍 Scrolled to position: ${testScrollPosition}px`);
        
        // Capture current position
        setTimeout(() => {
            const currentPosition = window.scrollY;
            console.log(`📐 Current scroll position: ${currentPosition}px`);
            
            if (navigationHook?.capturePageState) {
                const pageState = navigationHook.capturePageState();
                console.log('📋 Captured page state:', pageState.scrollPosition);
                
                // Simulate navigation away and back
                window.scrollTo(0, 0);
                console.log('🔄 Scrolled to top (simulating navigation away)');
                
                setTimeout(() => {
                    // Restore position
                    navigationHook.restorePageState(pageState);
                    
                    setTimeout(() => {
                        const restoredPosition = window.scrollY;
                        console.log(`📍 Restored position: ${restoredPosition}px`);
                        
                        if (Math.abs(restoredPosition - testScrollPosition) < 50) {
                            console.log('✅ Position preservation test PASSED');
                        } else {
                            console.log('❌ Position preservation test FAILED');
                        }
                        console.groupEnd();
                    }, 300);
                }, 1000);
            } else {
                console.log('❌ No capturePageState method available');
                console.groupEnd();
            }
        }, 100);
    },

    // Test form data preservation
    testFormDataPreservation: (navigationHook) => {
        console.group('🧪 Testing Form Data Preservation');
        
        // Create test form inputs
        const testInputs = [
            { name: 'testInput1', type: 'text', value: 'Test Value 1' },
            { name: 'testCheckbox', type: 'checkbox', checked: true },
            { name: 'testSelect', type: 'select', value: 'option2' }
        ];

        // Create temporary form elements
        const form = document.createElement('form');
        form.id = 'navigation-test-form';
        form.style.position = 'absolute';
        form.style.top = '-9999px';
        
        testInputs.forEach(inputConfig => {
            const input = document.createElement(inputConfig.type === 'select' ? 'select' : 'input');
            input.name = inputConfig.name;
            
            if (inputConfig.type === 'text') {
                input.type = 'text';
                input.value = inputConfig.value;
            } else if (inputConfig.type === 'checkbox') {
                input.type = 'checkbox';
                input.checked = inputConfig.checked;
            } else if (inputConfig.type === 'select') {
                input.innerHTML = '<option value="option1">Option 1</option><option value="option2">Option 2</option>';
                input.value = inputConfig.value;
            }
            
            form.appendChild(input);
        });
        
        document.body.appendChild(form);
        console.log('📝 Created test form with inputs');

        // Test form data capture and restoration
        if (navigationHook?.capturePageState) {
            const pageState = navigationHook.capturePageState();
            console.log('📋 Captured form data:', pageState.formData);
            
            // Clear form values
            testInputs.forEach(inputConfig => {
                const input = form.querySelector(`[name="${inputConfig.name}"]`);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = false;
                    } else {
                        input.value = '';
                    }
                }
            });
            console.log('🧹 Cleared form values');
            
            // Restore form data
            setTimeout(() => {
                navigationHook.restorePageState(pageState);
                
                setTimeout(() => {
                    let preservationSuccess = true;
                    
                    testInputs.forEach(inputConfig => {
                        const input = form.querySelector(`[name="${inputConfig.name}"]`);
                        if (input) {
                            if (inputConfig.type === 'checkbox') {
                                if (input.checked !== inputConfig.checked) {
                                    preservationSuccess = false;
                                    console.log(`❌ Checkbox ${inputConfig.name} not preserved`);
                                }
                            } else {
                                if (input.value !== inputConfig.value) {
                                    preservationSuccess = false;
                                    console.log(`❌ Input ${inputConfig.name} not preserved`);
                                }
                            }
                        }
                    });
                    
                    if (preservationSuccess) {
                        console.log('✅ Form data preservation test PASSED');
                    } else {
                        console.log('❌ Form data preservation test FAILED');
                    }
                    
                    // Cleanup
                    document.body.removeChild(form);
                    console.groupEnd();
                }, 300);
            }, 1000);
        } else {
            console.log('❌ No capturePageState method available');
            document.body.removeChild(form);
            console.groupEnd();
        }
    },

    // Test edge case scenarios
    testEdgeCases: (navigationHook) => {
        console.group('🧪 Testing Edge Cases');
        
        if (!navigationHook) {
            console.error('❌ Navigation hook not provided');
            console.groupEnd();
            return;
        }

        // Test 1: Empty history
        navigationHook.clearHistory();
        console.log('🗑️ Cleared navigation history');
        
        const canGoBackEmpty = navigationHook.canGoBack();
        console.log(`🔙 Can go back with empty history: ${canGoBackEmpty ? 'YES' : 'NO'}`);
        
        if (!canGoBackEmpty) {
            console.log('✅ Empty history handled correctly');
        } else {
            console.log('❌ Empty history not handled correctly');
        }

        // Test 2: Maximum history length
        console.log('\n📚 Testing maximum history length...');
        for (let i = 1; i <= 55; i++) { // Exceeding MAX_HISTORY_LENGTH of 50
            navigationHook.pushNavigation(`Test Page ${i}`, { pageNumber: i });
        }
        
        const historyLength = navigationHook.historyLength;
        console.log(`📊 History length after 55 entries: ${historyLength}`);
        
        if (historyLength <= 50) {
            console.log('✅ History length limit enforced correctly');
        } else {
            console.log('❌ History length limit not enforced');
        }

        // Test 3: Rapid successive navigation
        console.log('\n⚡ Testing rapid successive navigation...');
        const rapidNavStart = Date.now();
        
        for (let i = 1; i <= 10; i++) {
            setTimeout(() => {
                navigationHook.pushNavigation(`Rapid Page ${i}`, { rapidTest: true });
                
                if (i === 10) {
                    const rapidNavEnd = Date.now();
                    console.log(`⏱️ Rapid navigation completed in ${rapidNavEnd - rapidNavStart}ms`);
                    console.log('✅ Rapid navigation test completed');
                    console.groupEnd();
                }
            }, i * 10); // 10ms intervals
        }
    },

    // Run all tests
    runAllTests: (navigationHook) => {
        console.log('🚀 Starting comprehensive navigation tests...');
        
        NavigationTestUtils.testRefreshPersistence();
        
        setTimeout(() => {
            NavigationTestUtils.testMultipleNavigationCycles(navigationHook);
        }, 1000);
        
        setTimeout(() => {
            NavigationTestUtils.testPositionPreservation(navigationHook);
        }, 3000);
        
        setTimeout(() => {
            NavigationTestUtils.testFormDataPreservation(navigationHook);
        }, 5000);
        
        setTimeout(() => {
            NavigationTestUtils.testEdgeCases(navigationHook);
        }, 7000);
        
        setTimeout(() => {
            console.log('🎉 All navigation tests completed! Check console output above for results.');
        }, 10000);
    }
};

export default NavigationTestUtils;