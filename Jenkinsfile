pipeline {
    agent any

    options {
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        NODE_OPTIONS = '--max-old-space-size=512'
    }

    stages {
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        export VERSION=v20.11.0
                        export DISTRO=linux-x64
                        
                        # Cache Node.js binary if already unpacked
                        if [ ! -d "node-$VERSION-$DISTRO/bin" ]; then
                            echo "Downloading Node.js $VERSION..."
                            curl -fsSL https://nodejs.org/dist/$VERSION/node-$VERSION-$DISTRO.tar.gz -o node.tar.gz
                            tar -xzf node.tar.gz
                            rm -f node.tar.gz
                        fi
                        
                        export PATH=$PWD/node-$VERSION-$DISTRO/bin:$PATH
                        export NODE_OPTIONS="--max-old-space-size=512"
                        
                        echo "Node version: $(node -v), NPM version: $(npm -v)"
                        
                        echo "Installing dependencies (cached/offline preferred)..."
                        npm install --prefer-offline --no-audit --no-fund
                        chmod +x node_modules/.bin/*
                        
                        echo "Building production frontend bundle..."
                        npm run build
                        
                        if [ ! -f "dist/index.html" ]; then
                            echo "ERROR: Build failed to produce dist/index.html!"
                            exit 1
                        fi
                        echo "Frontend build successfully verified in dist/."
                    '''
                }
            }
        }

        stage('Deploy to Server') {
            steps {
                sh '''
                    echo "Deploying frontend build to production web root..."
                    HOST_IP="172.17.0.1"
                    DEPLOY_USER="itwekala-ttsmp"
                    WEB_ROOT="/home/itwekala-ttsmp/htdocs/ttsmp.itwekala.com.lk/public_html"
                    
                    # Ensure public_html exists
                    ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${HOST_IP} "mkdir -p ${WEB_ROOT}"
                    
                    # Deploy new build files directly to the web root
                    echo "Syncing build files to ${WEB_ROOT}..."
                    scp -o StrictHostKeyChecking=no -r frontend/dist/* ${DEPLOY_USER}@${HOST_IP}:${WEB_ROOT}/
                    
                    echo "Frontend successfully deployed to production web root!"
                '''
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully! TTS Portal frontend is live on https://ttsmp.itwekala.com.lk"
        }
        failure {
            echo "Pipeline failed. Review build logs above for diagnostics."
        }
    }
}
